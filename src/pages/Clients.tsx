import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useAsync } from '@/hooks/useAsync'
import { useCurrency } from '@/hooks/useCurrency'
import { getClients, getInvoices } from '@/lib/api'
import { effectiveStatus, invoiceTotal } from '@/lib/invoice'
import { formatMoney } from '@/lib/utils'
import { useUi } from '@/store/ui'

export default function Clients() {
  const navigate = useNavigate()
  const currency = useCurrency()
  const dataVersion = useUi((s) => s.dataVersion)
  const openClientForm = useUi((s) => s.openClientForm)
  const { data: clients } = useAsync(getClients, [dataVersion])
  const { data: invoices } = useAsync(getInvoices, [dataVersion])
  const [query, setQuery] = useState('')

  const ready = clients !== undefined && invoices !== undefined

  const rows = useMemo(() => {
    if (!clients || !invoices) return []
    const q = query.trim().toLowerCase()
    return clients
      .map((c) => {
        const theirs = invoices.filter((i) => i.clientId === c.id)
        const outstanding = theirs
          .filter((i) => effectiveStatus(i) === 'sent' || effectiveStatus(i) === 'overdue')
          .reduce((s, i) => s + invoiceTotal(i), 0)
        return { client: c, count: theirs.length, outstanding }
      })
      .filter(
        ({ client }) =>
          !q ||
          client.name.toLowerCase().includes(q) ||
          client.company.toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q),
      )
      .sort((a, b) => b.outstanding - a.outstanding || a.client.company.localeCompare(b.client.company))
  }, [clients, invoices, query])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Clients"
        subtitle="Everyone you invoice, and what they owe."
        actions={
          <Button variant="primary" onClick={() => openClientForm()}>
            <UserPlus className="h-4 w-4" />
            New client
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="pl-9"
          aria-label="Search clients"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="px-4 py-3 text-right font-medium">Invoices</th>
              <th className="px-4 py-3 text-right font-medium">Outstanding</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <SkeletonRows rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={Users}
                    title={query ? 'No clients match' : 'No clients yet'}
                    description={
                      query ? 'Try a different search.' : 'Add your first client to start invoicing.'
                    }
                    action={
                      !query && (
                        <Button variant="primary" onClick={() => openClientForm()}>
                          <UserPlus className="h-4 w-4" />
                          New client
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map(({ client, count, outstanding }) => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="group h-[60px] cursor-pointer border-t border-line transition-colors hover:bg-card-hover"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar src={client.avatar} name={client.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{client.company}</div>
                        <div className="truncate text-xs text-muted">{client.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-muted sm:table-cell">
                    <span className="truncate">{client.email}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular text-muted">{count}</td>
                  <td className="px-4 py-2 text-right tabular font-medium text-ink">
                    {outstanding > 0 ? formatMoney(outstanding, currency) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-faint transition-colors group-hover:text-muted" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
