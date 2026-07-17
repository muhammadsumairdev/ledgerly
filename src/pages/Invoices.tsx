import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Copy,
  CreditCard,
  Eye,
  FilePlus2,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { Confetti } from '@/components/ui/Confetti'
import { useAsync } from '@/hooks/useAsync'
import { useCurrency } from '@/hooks/useCurrency'
import { getClients, getInvoices, removeInvoice, reserveInvoiceNumber, saveInvoice } from '@/lib/api'
import { effectiveStatus, invoiceTotal, todayISO } from '@/lib/invoice'
import { formatDateShort, formatMoney, makeId } from '@/lib/utils'
import { STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { toast } from 'sonner'
import { useUi } from '@/store/ui'
import type { DisplayStatus, Invoice } from '@/types'
import { addDaysISO } from '@/lib/date'

type StatusFilter = DisplayStatus | 'all'

export default function Invoices() {
  const navigate = useNavigate()
  const currency = useCurrency()
  const dataVersion = useUi((s) => s.dataVersion)
  const bumpData = useUi((s) => s.bumpData)
  const { data: invoices } = useAsync(getInvoices, [dataVersion])
  const { data: clients } = useAsync(getClients, [dataVersion])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [clientId, setClientId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; up: boolean } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const ready = invoices !== undefined && clients !== undefined
  const clientName = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients])

  const rows = useMemo(() => {
    if (!invoices) return []
    const q = query.trim().toLowerCase()
    return invoices
      .map((inv) => ({ inv, eff: effectiveStatus(inv), total: invoiceTotal(inv) }))
      .filter(({ inv, eff }) => {
        if (status !== 'all' && eff !== status) return false
        if (clientId !== 'all' && inv.clientId !== clientId) return false
        if (from && inv.issueDate < from) return false
        if (to && inv.issueDate > to) return false
        if (q) {
          const c = clientName.get(inv.clientId)
          const hay = `${inv.number} ${c?.company ?? ''} ${c?.name ?? ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.inv.issueDate.localeCompare(a.inv.issueDate))
  }, [invoices, query, status, clientId, from, to, clientName])

  const hasFilters = query || status !== 'all' || clientId !== 'all' || from || to
  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setClientId('all')
    setFrom('')
    setTo('')
  }

  const markSent = async (inv: Invoice) => {
    await saveInvoice({ ...inv, status: 'sent' })
    bumpData()
    toast.success(`${inv.number} marked as sent`)
  }

  const recordPayment = async (inv: Invoice) => {
    const wasOverdue = effectiveStatus(inv) === 'overdue'
    await saveInvoice({ ...inv, status: 'paid', paidAt: new Date().toISOString() })
    bumpData()
    if (wasOverdue) {
      setCelebrate(true)
      window.setTimeout(() => setCelebrate(false), 1100)
    }
    toast.success(`Payment recorded for ${inv.number}`)
  }

  const duplicate = async (inv: Invoice) => {
    const number = reserveInvoiceNumber()
    const copy: Invoice = {
      ...inv,
      id: makeId('inv'),
      number,
      status: 'draft',
      issueDate: todayISO(),
      dueDate: addDaysISO(todayISO(), 30),
      paidAt: null,
      createdAt: new Date().toISOString(),
      lineItems: inv.lineItems.map((li) => ({ ...li, id: makeId('li') })),
    }
    await saveInvoice(copy)
    bumpData()
    toast.success(`Duplicated to ${number}`)
    navigate(`/invoices/${copy.id}/edit`)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { number } = deleteTarget
    setDeleteTarget(null)
    await removeInvoice(deleteTarget.id)
    bumpData()
    toast.success(`${number} deleted`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Confetti show={celebrate} onDone={() => setCelebrate(false)} />

      <PageHeader
        title="Invoices"
        subtitle="Create, send, and track every invoice."
        actions={
          <Button variant="primary" onClick={() => navigate('/invoices/new')}>
            <FilePlus2 className="h-4 w-4" />
            New invoice
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or client…"
            className="pl-9"
            aria-label="Search invoices"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="w-auto min-w-[130px]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-auto min-w-[150px]"
          aria-label="Filter by client"
        >
          <option value="all">All clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.company}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-auto"
          aria-label="Issued from"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-auto"
          aria-label="Issued to"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-visible rounded-xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {!ready ? (
                <SkeletonRows rows={8} cols={7} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={FileText}
                      title={hasFilters ? 'No invoices match' : 'No invoices yet'}
                      description={
                        hasFilters
                          ? 'Try clearing the filters.'
                          : 'Create your first invoice to get paid.'
                      }
                      action={
                        hasFilters ? (
                          <Button variant="secondary" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        ) : (
                          <Button variant="primary" onClick={() => navigate('/invoices/new')}>
                            <FilePlus2 className="h-4 w-4" />
                            New invoice
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map(({ inv, eff, total }) => {
                  const c = clientName.get(inv.clientId)
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                      className="group h-[52px] cursor-pointer border-t border-line transition-colors hover:bg-card-hover"
                    >
                      <td className="px-4 py-2 font-mono text-[13px] font-medium text-ink">
                        {inv.number}
                      </td>
                      <td className="px-4 py-2">
                        <div className="truncate font-medium text-ink">{c?.company ?? '—'}</div>
                      </td>
                      <td className="px-4 py-2 text-muted tabular">{formatDateShort(inv.issueDate)}</td>
                      <td className="px-4 py-2 text-muted tabular">{formatDateShort(inv.dueDate)}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={eff} size="sm" />
                      </td>
                      <td className="px-4 py-2 text-right tabular font-medium text-ink">
                        {formatMoney(total, currency)}
                      </td>
                      <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          aria-label="Invoice actions"
                          onClick={(e) => {
                            if (menu?.id === inv.id) return setMenu(null)
                            const r = e.currentTarget.getBoundingClientRect()
                            const up = window.innerHeight - r.bottom < 260
                            setMenu({
                              id: inv.id,
                              x: window.innerWidth - r.right,
                              y: up ? window.innerHeight - r.top : r.bottom,
                              up,
                            })
                          }}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-app hover:text-ink"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ready && rows.length > 0 && (
        <p className="text-xs text-muted">
          {rows.length} invoice{rows.length === 1 ? '' : 's'}
          {hasFilters ? ' matching filters' : ''}.
        </p>
      )}

      {/* Row action menu — portaled to the body so it is never clipped by the
          table's horizontal-scroll container. */}
      {(() => {
        const active = menu ? rows.find((r) => r.inv.id === menu.id) : undefined
        if (!menu || !active) return null
        const inv = active.inv
        return (
          <RowMenu
            anchor={menu}
            onClose={() => setMenu(null)}
            status={active.eff}
            onEdit={() => navigate(`/invoices/${inv.id}/edit`)}
            onPreview={() => navigate(`/invoices/${inv.id}`)}
            onMarkSent={() => markSent(inv)}
            onRecordPayment={() => recordPayment(inv)}
            onDuplicate={() => duplicate(inv)}
            onDelete={() => setDeleteTarget(inv)}
          />
        )
      })()}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete invoice"
        description={`${deleteTarget?.number} will be permanently removed.`}
      >
        <div className="flex justify-end gap-2 p-5">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/** Contextual action popover for a table row, portaled to the body and fixed-
 *  positioned from the trigger's rect so it is never clipped by the table's
 *  scroll container. Flips upward near the viewport bottom. */
function RowMenu({
  anchor,
  onClose,
  status,
  onEdit,
  onPreview,
  onMarkSent,
  onRecordPayment,
  onDuplicate,
  onDelete,
}: {
  anchor: { x: number; y: number; up: boolean }
  onClose: () => void
  status: DisplayStatus
  onEdit: () => void
  onPreview: () => void
  onMarkSent: () => void
  onRecordPayment: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const run = (fn: () => void) => () => {
    onClose()
    fn()
  }
  // Close on Escape or when the page scrolls under the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  const style: React.CSSProperties = anchor.up
    ? { right: anchor.x, bottom: anchor.y + 6 }
    : { right: anchor.x, top: anchor.y + 6 }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <motion.div
        role="menu"
        style={style}
        initial={{ opacity: 0, scale: 0.96, y: anchor.up ? 4 : -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[56] w-44 overflow-hidden rounded-xl border border-line bg-card p-1 text-left shadow-lg"
      >
        <MenuItem icon={Pencil} label="Edit" onClick={run(onEdit)} />
        <MenuItem icon={Eye} label="Preview / print" onClick={run(onPreview)} />
        {status === 'draft' && <MenuItem icon={Send} label="Mark as sent" onClick={run(onMarkSent)} />}
        {(status === 'sent' || status === 'overdue') && (
          <MenuItem icon={CreditCard} label="Record payment" onClick={run(onRecordPayment)} />
        )}
        <MenuItem icon={Copy} label="Duplicate" onClick={run(onDuplicate)} />
        <div className="my-1 h-px bg-line" />
        <MenuItem icon={Trash2} label="Delete" danger onClick={run(onDelete)} />
      </motion.div>
    </>,
    document.body,
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-500/10' : 'text-ink-soft hover:bg-card-hover'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
