import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Mail, MapPin, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { StatusPill } from '@/components/ui/StatusPill'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAsync } from '@/hooks/useAsync'
import { useCurrency } from '@/hooks/useCurrency'
import { getClients, getInvoices } from '@/lib/api'
import { effectiveStatus, invoiceTotal } from '@/lib/invoice'
import { formatDateShort, formatMoney } from '@/lib/utils'
import { useUi } from '@/store/ui'

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold tabular ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currency = useCurrency()
  const dataVersion = useUi((s) => s.dataVersion)
  const openClientForm = useUi((s) => s.openClientForm)
  const { data: clients } = useAsync(getClients, [dataVersion])
  const { data: invoices } = useAsync(getInvoices, [dataVersion])

  const client = clients?.find((c) => c.id === id)

  const rollup = useMemo(() => {
    const theirs = (invoices ?? [])
      .filter((i) => i.clientId === id)
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    const outstanding = theirs
      .filter((i) => effectiveStatus(i) === 'sent' || effectiveStatus(i) === 'overdue')
      .reduce((s, i) => s + invoiceTotal(i), 0)
    const paid = theirs.filter((i) => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0)
    const billed = theirs.reduce((s, i) => s + invoiceTotal(i), 0)
    return { theirs, outstanding, paid, billed }
  }, [invoices, id])

  const loading = clients === undefined || invoices === undefined

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-4 w-24" />
        <div className="rounded-xl border border-line bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={FileText}
          title="Client not found"
          description="This client may have been deleted."
          action={
            <Button variant="primary" onClick={() => navigate('/clients')}>
              Back to clients
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar src={client.avatar} name={client.name} size="lg" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">{client.company}</h1>
            <p className="text-sm text-muted">{client.name}</p>
            <div className="mt-2 space-y-1 text-sm text-muted">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-faint" />
                {client.email}
              </div>
              {client.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                  <span className="whitespace-pre-line">{client.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openClientForm(client.id)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/invoices/new?client=${client.id}`)}
          >
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      {/* Balance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Outstanding" value={formatMoney(rollup.outstanding, currency)} accent />
        <Stat label="Paid" value={formatMoney(rollup.paid, currency)} />
        <Stat label="Total billed" value={formatMoney(rollup.billed, currency)} />
      </div>

      {/* Invoices */}
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">Invoices</h2>
        </div>
        {rollup.theirs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description={`Create the first invoice for ${client.company}.`}
            action={
              <Button variant="primary" onClick={() => navigate(`/invoices/new?client=${client.id}`)}>
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rollup.theirs.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  className="h-14 cursor-pointer border-t border-line first:border-t-0 transition-colors hover:bg-card-hover"
                >
                  <td className="px-5 py-2 font-mono text-[13px] font-medium text-ink">
                    {inv.number}
                  </td>
                  <td className="px-4 py-2 text-muted">{formatDateShort(inv.issueDate)}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={effectiveStatus(inv)} size="sm" />
                  </td>
                  <td className="px-5 py-2 text-right tabular font-medium text-ink">
                    {formatMoney(invoiceTotal(inv), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
