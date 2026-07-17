import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, ArrowUpRight, Clock, FileText, Plus, Wallet, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'
import { useAsync } from '@/hooks/useAsync'
import { useCountUp } from '@/hooks/useCountUp'
import { useCurrency } from '@/hooks/useCurrency'
import { getClients, getInvoices } from '@/lib/api'
import { daysToPayment, effectiveStatus, invoiceTotal } from '@/lib/invoice'
import { STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { formatCompactMoney, formatDateShort, formatMoney } from '@/lib/utils'
import { useUi } from '@/store/ui'

function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`rounded-xl border border-line bg-card p-5 ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function StatCard({
  label,
  icon: Icon,
  value,
  format,
  sub,
  tone,
}: {
  label: string
  icon: LucideIcon
  value: number
  format?: (n: number) => string
  sub: string
  tone?: 'accent' | 'danger'
}) {
  const n = useCountUp(value)
  const iconTone =
    tone === 'danger'
      ? 'bg-red-500/10 text-red-600'
      : tone === 'accent'
        ? 'bg-accent-soft text-accent'
        : 'bg-accent-soft text-accent'
  return (
    <div className="rounded-xl border border-line bg-card p-5 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular text-ink">
        {format ? format(n) : Math.round(n).toLocaleString('en-US')}
      </div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-2.5 h-3 w-28" />
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  label?: string
  payload?: { value: number }[]
  currency: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-sm"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <p className="text-faint">{label}</p>
      <p className="mt-0.5 font-semibold tabular text-ink">{formatMoney(payload[0].value, currency)}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const currency = useCurrency()
  const dataVersion = useUi((s) => s.dataVersion)
  const { data: invoices } = useAsync(getInvoices, [dataVersion])
  const { data: clients } = useAsync(getClients, [dataVersion])

  const clientMap = useMemo(() => new Map((clients ?? []).map((c) => [c.id, c])), [clients])

  const stats = useMemo(() => {
    const inv = invoices ?? []
    const now = new Date()
    let outstanding = 0
    let paidThisMonth = 0
    let overdue = 0
    const payDays: number[] = []
    for (const i of inv) {
      const eff = effectiveStatus(i)
      const total = invoiceTotal(i)
      if (eff === 'sent' || eff === 'overdue') outstanding += total
      if (eff === 'overdue') overdue += 1
      if (i.status === 'paid' && i.paidAt) {
        const p = new Date(i.paidAt)
        if (p.getFullYear() === now.getFullYear() && p.getMonth() === now.getMonth())
          paidThisMonth += total
        const d = daysToPayment(i)
        if (d !== null) payDays.push(d)
      }
    }
    const avgDays = payDays.length ? Math.round(payDays.reduce((a, b) => a + b, 0) / payDays.length) : 0
    return { outstanding, paidThisMonth, overdue, avgDays }
  }, [invoices])

  // Paid revenue bucketed into the last 6 months.
  const revenue = useMemo(() => {
    const base = new Date()
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1)
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleString('en-US', { month: 'short' }),
        revenue: 0,
      }
    })
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    for (const i of invoices ?? []) {
      if (i.status !== 'paid' || !i.paidAt) continue
      const p = new Date(i.paidAt)
      const b = byKey.get(`${p.getFullYear()}-${p.getMonth()}`)
      if (b) b.revenue += invoiceTotal(i)
    }
    return buckets
  }, [invoices])

  const mix = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, sent: 0, overdue: 0, paid: 0 }
    for (const i of invoices ?? []) counts[effectiveStatus(i)] += 1
    const data = STATUS_ORDER.map((s) => ({ status: s, label: STATUS_META[s].label, value: counts[s], color: STATUS_META[s].color }))
    return { data, total: (invoices ?? []).length }
  }, [invoices])

  const recent = useMemo(
    () =>
      [...(invoices ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [invoices],
  )

  const ready = invoices !== undefined && clients !== undefined
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`${today} · your billing at a glance.`}
        actions={
          <Button variant="primary" onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ready ? (
          <>
            <StatCard
              label="Outstanding"
              icon={Wallet}
              value={stats.outstanding}
              format={(n) => formatCompactMoney(n, currency)}
              sub="Sent & overdue, unpaid"
              tone="accent"
            />
            <StatCard
              label="Paid this month"
              icon={ArrowUpRight}
              value={stats.paidThisMonth}
              format={(n) => formatCompactMoney(n, currency)}
              sub="Payments recorded"
            />
            <StatCard
              label="Overdue"
              icon={AlertTriangle}
              value={stats.overdue}
              sub="Past due date"
              tone={stats.overdue > 0 ? 'danger' : 'accent'}
            />
            <StatCard
              label="Avg days to pay"
              icon={Clock}
              value={stats.avgDays}
              sub="From issue to payment"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        )}
      </div>

      {/* Revenue + status mix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Revenue" subtitle="Payments received, last 6 months" className="lg:col-span-2">
          {ready ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickMargin={8}
                  />
                  <YAxis
                    width={52}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickFormatter={(v: number) => formatCompactMoney(v, currency)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--card-hover)' }}
                    content={<ChartTooltip currency={currency} />}
                  />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Skeleton className="h-60 w-full rounded-lg" />
          )}
        </Panel>

        <Panel title="Status mix" subtitle="All invoices by status">
          {ready ? (
            <div className="flex flex-col items-center">
              <div className="relative h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mix.data.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={54}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {mix.data
                        .filter((d) => d.value > 0)
                        .map((d) => (
                          <Cell key={d.status} fill={d.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload && payload[0] ? (
                          <div
                            className="rounded-lg px-3 py-1.5 text-xs shadow-sm"
                            style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
                          >
                            <span className="font-medium text-ink">{payload[0].name}: </span>
                            <span className="tabular text-muted">{payload[0].value}</span>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tabular text-ink">{mix.total}</span>
                  <span className="text-[11px] text-muted">invoices</span>
                </div>
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                {mix.data.map((d) => (
                  <div key={d.status} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted">{d.label}</span>
                    <span className="ml-auto tabular font-medium text-ink">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Skeleton className="h-44 w-44 rounded-full" />
              <Skeleton className="mt-4 h-16 w-full" />
            </div>
          )}
        </Panel>
      </div>

      {/* Recent invoices */}
      <Panel
        title="Recent invoices"
        subtitle="Your latest activity"
        action={
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            View all
          </button>
        }
      >
        {!ready ? (
          <ul className="-my-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </li>
            ))}
          </ul>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to get paid."
            action={
              <Button variant="primary" onClick={() => navigate('/invoices/new')}>
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            }
          />
        ) : (
          <ul>
            {recent.map((inv) => (
              <li key={inv.id}>
                <button
                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0 transition-colors hover:bg-card-hover -mx-2 px-2 rounded-lg"
                >
                  <span className="font-mono text-[13px] font-medium text-ink">{inv.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {clientMap.get(inv.clientId)?.company ?? '—'}
                  </span>
                  <StatusPill status={effectiveStatus(inv)} size="sm" />
                  <span className="hidden shrink-0 text-xs text-faint tabular sm:inline">
                    {formatDateShort(inv.issueDate)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm font-medium tabular text-ink">
                    {formatMoney(invoiceTotal(inv), currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
