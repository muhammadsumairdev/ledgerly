import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CreditCard, FileText, Loader2, Pencil, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Confetti } from '@/components/ui/Confetti'
import { InvoiceDocument } from '@/components/InvoiceDocument'
import { useAsync } from '@/hooks/useAsync'
import { getClients, getInvoices, getSettings, saveInvoice } from '@/lib/api'
import { effectiveStatus } from '@/lib/invoice'
import { useUi } from '@/store/ui'
import { toast } from 'sonner'

export default function InvoicePreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dataVersion = useUi((s) => s.dataVersion)
  const bumpData = useUi((s) => s.bumpData)
  const [celebrate, setCelebrate] = useState(false)

  const { data: invoices } = useAsync(getInvoices, [dataVersion])
  const { data: clients } = useAsync(getClients, [dataVersion])
  const { data: settings } = useAsync(getSettings, [dataVersion])

  const loading = invoices === undefined || clients === undefined || settings === undefined
  const invoice = invoices?.find((i) => i.id === id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-faint">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!invoice || !settings) {
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

  const eff = effectiveStatus(invoice)
  const client = clients?.find((c) => c.id === invoice.clientId)

  const recordPayment = async () => {
    const wasOverdue = eff === 'overdue'
    await saveInvoice({ ...invoice, status: 'paid', paidAt: new Date().toISOString() })
    bumpData()
    if (wasOverdue) {
      setCelebrate(true)
      window.setTimeout(() => setCelebrate(false), 1100)
    }
    toast.success(`Payment recorded for ${invoice.number}`)
  }

  return (
    <div className="space-y-5">
      <Confetti show={celebrate} onDone={() => setCelebrate(false)} />

      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          {(eff === 'sent' || eff === 'overdue') && (
            <Button variant="secondary" size="sm" onClick={recordPayment}>
              <CreditCard className="h-4 w-4" />
              Record payment
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Document — the only thing that prints */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="print-area mx-auto max-w-[820px] overflow-hidden rounded-lg shadow-xl ring-1 ring-black/5"
      >
        <InvoiceDocument invoice={invoice} client={client} settings={settings} />
      </motion.div>
    </div>
  )
}
