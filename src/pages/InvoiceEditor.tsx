import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Check,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Plus,
  Send,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { Confetti } from '@/components/ui/Confetti'
import { InvoiceDocument } from '@/components/InvoiceDocument'
import { useAsync } from '@/hooks/useAsync'
import { getClients, getInvoices, getSettings, removeInvoice, reserveInvoiceNumber, saveInvoice } from '@/lib/api'
import { computeTotals, effectiveStatus, round2, todayISO } from '@/lib/invoice'
import { addDaysISO } from '@/lib/date'
import { formatMoney, makeId } from '@/lib/utils'
import { useUi } from '@/store/ui'
import type { Invoice, LineItem, Settings } from '@/types'

type SaveState = 'idle' | 'saving' | 'saved'

const blankLine = (): LineItem => ({ id: makeId('li'), description: '', qty: 1, rate: 0, taxable: true })

export default function InvoiceEditor() {
  const { id } = useParams<{ id: string }>()
  const mode = id ? 'edit' : 'new'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const bumpData = useUi((s) => s.bumpData)
  const openClientForm = useUi((s) => s.openClientForm)

  const dataVersion = useUi((s) => s.dataVersion)
  const { data: clients } = useAsync(getClients, [dataVersion])
  const { data: settings } = useAsync(getSettings, [dataVersion])
  const { data: existing } = useAsync(
    async () => (id ? ((await getInvoices()).find((i) => i.id === id) ?? null) : null),
    [id],
  )

  const [draft, setDraft] = useState<Invoice | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [celebrate, setCelebrate] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sendError, setSendError] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)
  const fadeTimer = useRef<number | undefined>(undefined)
  // Latest edit not yet persisted — flushed on unmount so a change made <700ms
  // before navigating away is never lost.
  const dirtyRef = useRef<Invoice | null>(null)

  // Initialise the working draft once its data has loaded.
  useEffect(() => {
    if (draft || !clients || !settings) return
    if (mode === 'edit') {
      if (existing === undefined) return // still loading
      if (existing === null) return // not found — handled below
      setDraft(existing)
    } else {
      const preselect = params.get('client')
      setDraft({
        id: makeId('inv'),
        number: `${settings.prefix}-${String(settings.nextNumber).padStart(4, '0')}`,
        clientId: preselect && clients.some((c) => c.id === preselect) ? preselect : clients[0]?.id ?? '',
        issueDate: todayISO(),
        dueDate: addDaysISO(todayISO(), 30),
        status: 'draft',
        lineItems: [blankLine()],
        discount: 0,
        taxRate: settings.defaultTaxRate,
        paidAt: null,
        notes: 'Thank you for your business!',
        terms: `Net 30 — bank transfer or card`,
        createdAt: new Date().toISOString(),
      })
    }
  }, [clients, settings, existing, mode, draft, params])

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
      window.clearTimeout(fadeTimer.current)
      // Flush a pending debounced edit. save() writes to storage synchronously
      // before its simulated latency, so this persists even as we unmount.
      if (dirtyRef.current) void saveInvoice(dirtyRef.current)
    },
    [],
  )

  const flagSaved = () => {
    setSaveState('saved')
    window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => setSaveState('idle'), 1600)
  }

  // Debounced background autosave for existing invoices.
  const scheduleSave = (next: Invoice) => {
    if (mode !== 'edit') return
    dirtyRef.current = next
    window.clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = window.setTimeout(() => {
      dirtyRef.current = null
      void saveInvoice(next).then(flagSaved)
    }, 700)
  }

  const saveNow = async (next: Invoice) => {
    dirtyRef.current = null
    window.clearTimeout(saveTimer.current)
    setSaveState('saving')
    await saveInvoice(next)
    flagSaved()
  }

  const update = (patch: Partial<Invoice>) =>
    setDraft((d) => {
      if (!d) return d
      const next = { ...d, ...patch }
      scheduleSave(next)
      return next
    })

  const updateLine = (lid: string, patch: Partial<LineItem>) =>
    setDraft((d) => {
      if (!d) return d
      const next = { ...d, lineItems: d.lineItems.map((li) => (li.id === lid ? { ...li, ...patch } : li)) }
      scheduleSave(next)
      return next
    })

  const addLine = () => update({ lineItems: [...(draft?.lineItems ?? []), blankLine()] })
  const removeLine = (lid: string) =>
    update({ lineItems: (draft?.lineItems ?? []).filter((li) => li.id !== lid) })

  const totals = useMemo(() => (draft ? computeTotals(draft) : null), [draft])
  const currency = settings?.currency ?? 'USD'
  const isValid =
    !!draft?.clientId && (draft?.lineItems.some((li) => li.description.trim() && li.qty > 0) ?? false)

  // --- actions ---------------------------------------------------------------
  const create = async (send: boolean) => {
    if (!draft) return
    if (send && !isValid) {
      setSendError(true)
      return
    }
    const number = reserveInvoiceNumber()
    const record: Invoice = { ...draft, number, status: send ? 'sent' : 'draft' }
    await saveInvoice(record)
    // Navigating new → edit does NOT remount this component (same element slot),
    // so sync local state to the saved record; otherwise the now-'edit' autosave
    // would persist the stale draft (wrong status / provisional number) back.
    dirtyRef.current = null
    setDraft(record)
    bumpData()
    toast(send ? `${number} saved & marked sent` : `${number} saved as draft`)
    navigate(`/invoices/${record.id}/edit`, { replace: true })
  }

  const markSent = async () => {
    if (!draft) return
    if (!isValid) {
      setSendError(true)
      return
    }
    const next = { ...draft, status: 'sent' as const }
    setDraft(next)
    await saveNow(next)
    bumpData()
    toast.success(`${next.number} marked as sent`)
  }

  const recordPayment = async () => {
    if (!draft) return
    const wasOverdue = effectiveStatus(draft) === 'overdue'
    const next = { ...draft, status: 'paid' as const, paidAt: new Date().toISOString() }
    setDraft(next)
    await saveNow(next)
    bumpData()
    if (wasOverdue) {
      setCelebrate(true)
      window.setTimeout(() => setCelebrate(false), 1100)
    }
    toast.success(`Payment recorded for ${next.number}`)
  }

  const doDelete = async () => {
    if (!draft) return
    setDeleteOpen(false)
    if (mode === 'edit') await removeInvoice(draft.id)
    bumpData()
    toast.success(`${draft.number} deleted`)
    navigate('/invoices')
  }

  // --- render ----------------------------------------------------------------
  if (mode === 'edit' && existing === null && clients && settings) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={FileText}
          title="Invoice not found"
          description="This invoice may have been deleted."
          action={
            <Button variant="primary" onClick={() => navigate('/invoices')}>
              Back to invoices
            </Button>
          }
        />
      </div>
    )
  }

  if (!draft || !settings || !clients) {
    return (
      <div className="flex items-center justify-center py-32 text-faint">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const eff = effectiveStatus(draft)

  return (
    <div className="space-y-5">
      <Confetti show={celebrate} onDone={() => setCelebrate(false)} />

      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-ink"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-semibold text-ink">{draft.number}</h1>
              <StatusPill status={eff} size="sm" />
            </div>
            <div className="h-4 text-xs text-muted">
              <AnimatePresence mode="wait">
                {saveState === 'saving' ? (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </motion.span>
                ) : saveState === 'saved' ? (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 text-accent"
                  >
                    <Check className="h-3 w-3" /> Saved
                  </motion.span>
                ) : mode === 'edit' ? (
                  <span>Autosaves as you type</span>
                ) : (
                  <span>New invoice</span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'edit' && (
            <Button
              variant="secondary"
              size="sm"
              aria-label="Preview and print"
              onClick={() => navigate(`/invoices/${draft.id}`)}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          )}
          {mode === 'edit' && draft.status === 'draft' && (
            <Button variant="secondary" size="sm" onClick={markSent}>
              <Send className="h-4 w-4" />
              Mark sent
            </Button>
          )}
          {mode === 'edit' && (eff === 'sent' || eff === 'overdue') && (
            <Button variant="primary" size="sm" onClick={recordPayment}>
              <CreditCard className="h-4 w-4" />
              Record payment
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} aria-label="Delete invoice">
            <Trash2 className="h-4 w-4" />
          </Button>
          {mode === 'new' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => create(false)}>
                Save draft
              </Button>
              <Button variant="primary" size="sm" onClick={() => create(true)}>
                <Send className="h-4 w-4" />
                Save &amp; send
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Two-pane: form + live document */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        {/* Form */}
        <div className="space-y-5 no-print">
          {/* Client + dates */}
          <section className="rounded-xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Bill to</h2>
              <button
                onClick={() => openClientForm()}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                <UserPlus className="h-3.5 w-3.5" />
                New client
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Client" error={sendError && !draft.clientId ? 'Choose a client' : undefined}>
                <Select
                  value={draft.clientId}
                  onChange={(e) => {
                    setSendError(false)
                    update({ clientId: e.target.value })
                  }}
                >
                  <option value="" disabled>
                    Select a client…
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} — {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Issue date">
                  <Input
                    type="date"
                    value={draft.issueDate}
                    onChange={(e) => update({ issueDate: e.target.value })}
                  />
                </Field>
                <Field label="Due date">
                  <Input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => update({ dueDate: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-line bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Line items</h2>
              {sendError && !draft.lineItems.some((li) => li.description.trim() && li.qty > 0) && (
                <span className="text-xs text-red-500">Add at least one line</span>
              )}
            </div>

            {/* Column headers (desktop) */}
            <div className="mb-1 hidden grid-cols-[1fr_70px_100px_110px_auto] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-faint sm:grid">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            <div>
              <AnimatePresence initial={false}>
                {draft.lineItems.map((li) => (
                  <motion.div
                    key={li.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 items-start gap-2 py-1.5 sm:grid-cols-[1fr_70px_100px_110px_auto] sm:items-center">
                      <Input
                        value={li.description}
                        onChange={(e) => updateLine(li.id, { description: e.target.value })}
                        placeholder="Description"
                        aria-label="Line item description"
                        className="col-span-2 sm:col-span-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={li.qty}
                        onChange={(e) => updateLine(li.id, { qty: Number(e.target.value) })}
                        className="text-right tabular"
                        aria-label="Quantity"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={li.rate}
                        onChange={(e) => updateLine(li.id, { rate: Number(e.target.value) })}
                        className="text-right tabular"
                        aria-label="Rate"
                      />
                      <div className="flex h-9 items-center justify-end pr-1 text-sm tabular font-medium text-ink">
                        {formatMoney(round2((Number(li.qty) || 0) * (Number(li.rate) || 0)), currency)}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => updateLine(li.id, { taxable: !li.taxable })}
                          title={li.taxable ? 'Taxable — click to exempt' : 'Tax exempt — click to tax'}
                          className={`rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                            li.taxable
                              ? 'bg-accent-soft text-accent'
                              : 'bg-card-hover text-faint'
                          }`}
                        >
                          TAX
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(li.id)}
                          disabled={draft.lineItems.length === 1}
                          aria-label="Remove line"
                          className="rounded-md p-1.5 text-faint transition-colors hover:bg-card-hover hover:text-red-500 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-faint"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              <Plus className="h-4 w-4" />
              Add line item
            </button>
          </section>

          {/* Discount + tax + totals */}
          <section className="rounded-xl border border-line bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Discount (${currency})`}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.discount}
                  onChange={(e) => update({ discount: Number(e.target.value) })}
                  className="tabular"
                />
              </Field>
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={draft.taxRate}
                  onChange={(e) => update({ taxRate: Number(e.target.value) })}
                  className="tabular"
                />
              </Field>
            </div>

            {totals && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="tabular text-ink">{formatMoney(totals.subtotal, currency)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Discount</span>
                    <span className="tabular text-ink">−{formatMoney(totals.discount, currency)}</span>
                  </div>
                )}
                {draft.taxRate > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Tax ({draft.taxRate}%)</span>
                    <span className="tabular text-ink">{formatMoney(totals.tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                  <span>Total</span>
                  <span className="tabular">{formatMoney(totals.total, currency)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Notes + terms */}
          <section className="rounded-xl border border-line bg-card p-5">
            <div className="space-y-4">
              <Field label="Payment terms">
                <Input value={draft.terms} onChange={(e) => update({ terms: e.target.value })} />
              </Field>
              <Field label="Notes">
                <Textarea rows={2} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
              </Field>
            </div>
          </section>

          {mode === 'edit' && (
            <Link
              to={`/invoices/${draft.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover xl:hidden"
            >
              <Eye className="h-4 w-4" />
              Preview &amp; print
            </Link>
          )}
        </div>

        {/* Live document preview (signature). `print:block` un-hides it for
            Ctrl/Cmd+P from the editor — the form + toolbar are `no-print`, so
            only the document prints. */}
        <div className="hidden xl:block print:block">
          <div className="sticky top-20">
            <div className="rounded-2xl border border-line bg-app p-4">
              <div className="print-area overflow-hidden rounded-sm shadow-xl ring-1 ring-black/5">
                <InvoiceDocument
                  invoice={draft}
                  client={clients.find((c) => c.id === draft.clientId)}
                  settings={settings as Settings}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete invoice"
        description={`${draft.number} will be permanently removed.`}
      >
        <div className="flex justify-end gap-2 p-5">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={doDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
