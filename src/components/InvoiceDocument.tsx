import { computeTotals, effectiveStatus, round2 } from '@/lib/invoice'
import { STATUS_META, DOC } from '@/lib/constants'
import { formatDate, formatMoney } from '@/lib/utils'
import type { Client, Invoice, Settings } from '@/types'

/**
 * The invoice as a printable A4 document. Rendered live in the editor's right
 * pane and full-page on the preview route. Uses its own fixed light palette
 * (DOC) so it always looks like stationery — on white paper — regardless of the
 * app theme, and prints cleanly via the `.print-area` stylesheet.
 */
export function InvoiceDocument({
  invoice,
  client,
  settings,
}: {
  invoice: Invoice
  client: Client | undefined
  settings: Settings
}) {
  const currency = settings.currency
  const totals = computeTotals(invoice)
  const status = effectiveStatus(invoice)
  const statusMeta = STATUS_META[status]

  return (
    <div
      className="mx-auto w-full max-w-[794px] rounded-sm px-8 py-10 text-[13px] leading-relaxed sm:px-12 sm:py-12"
      style={{ background: DOC.paper, color: DOC.ink, fontFeatureSettings: "'tnum'" }}
    >
      {/* Header: business identity + invoice meta */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="h-12 w-12 rounded-lg object-contain" />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ background: DOC.accent }}
            >
              {settings.businessName.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-[15px] font-semibold" style={{ color: DOC.ink }}>
              {settings.businessName}
            </div>
            <div className="mt-1 whitespace-pre-line text-xs" style={{ color: DOC.soft }}>
              {settings.addressLine}
            </div>
            <div className="mt-1 text-xs" style={{ color: DOC.soft }}>
              {settings.email}
              {settings.phone ? ` · ${settings.phone}` : ''}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: DOC.ink, letterSpacing: '-0.01em' }}
          >
            INVOICE
          </div>
          <div className="mt-1 font-mono text-sm" style={{ color: DOC.soft }}>
            {invoice.number}
          </div>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
            style={{ color: statusMeta.color, background: statusMeta.soft }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: statusMeta.color }}
            />
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Bill-to + dates */}
      <div
        className="mt-8 flex flex-wrap justify-between gap-6 border-t pt-6"
        style={{ borderColor: DOC.line }}
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: DOC.faint }}>
            Bill to
          </div>
          {client ? (
            <div className="mt-1.5">
              <div className="font-semibold" style={{ color: DOC.ink }}>
                {client.company}
              </div>
              <div style={{ color: DOC.soft }}>{client.name}</div>
              <div className="mt-1 whitespace-pre-line text-xs" style={{ color: DOC.soft }}>
                {client.address}
              </div>
              <div className="mt-1 text-xs" style={{ color: DOC.soft }}>
                {client.email}
              </div>
            </div>
          ) : (
            <div className="mt-1.5 italic" style={{ color: DOC.faint }}>
              No client selected
            </div>
          )}
        </div>

        <div className="text-right text-xs">
          <div className="flex justify-between gap-8">
            <span style={{ color: DOC.faint }}>Issue date</span>
            <span className="font-medium" style={{ color: DOC.ink }}>
              {formatDate(invoice.issueDate)}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-8">
            <span style={{ color: DOC.faint }}>Due date</span>
            <span className="font-medium" style={{ color: DOC.ink }}>
              {formatDate(invoice.dueDate)}
            </span>
          </div>
          {invoice.paidAt && (
            <div className="mt-1.5 flex justify-between gap-8">
              <span style={{ color: DOC.faint }}>Paid on</span>
              <span className="font-medium" style={{ color: DOC.accent }}>
                {formatDate(invoice.paidAt.slice(0, 10))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="mt-8 w-full border-collapse text-left">
        <thead>
          <tr
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: DOC.faint, borderBottom: `1px solid ${DOC.line}` }}
          >
            <th scope="col" className="pb-2 font-semibold">Description</th>
            <th scope="col" className="pb-2 text-right font-semibold">Qty</th>
            <th scope="col" className="pb-2 text-right font-semibold">Rate</th>
            <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center italic" style={{ color: DOC.faint }}>
                No line items yet
              </td>
            </tr>
          ) : (
            invoice.lineItems.map((li) => (
              <tr key={li.id} style={{ borderBottom: `1px solid ${DOC.line}` }}>
                <td className="py-2.5 pr-4 align-top">
                  <span style={{ color: DOC.ink }}>{li.description || '—'}</span>
                  {!li.taxable && invoice.taxRate > 0 && (
                    <span className="ml-2 text-[10px]" style={{ color: DOC.faint }}>
                      (no tax)
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right align-top tabular" style={{ color: DOC.soft }}>
                  {li.qty}
                </td>
                <td className="py-2.5 text-right align-top tabular" style={{ color: DOC.soft }}>
                  {formatMoney(li.rate, currency)}
                </td>
                <td
                  className="py-2.5 text-right align-top tabular font-medium"
                  style={{ color: DOC.ink }}
                >
                  {formatMoney(round2(li.qty * li.rate), currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-[260px] space-y-2 text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
          {totals.discount > 0 && (
            <Row label="Discount" value={`−${formatMoney(totals.discount, currency)}`} />
          )}
          {invoice.taxRate > 0 && (
            <Row label={`Tax (${invoice.taxRate}%)`} value={formatMoney(totals.tax, currency)} />
          )}
          <div
            className="mt-2 flex items-center justify-between border-t pt-3 text-base font-bold"
            style={{ borderColor: DOC.line, color: DOC.ink }}
          >
            <span>Total due</span>
            <span className="tabular">{formatMoney(totals.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes + terms */}
      {(invoice.notes || invoice.terms) && (
        <div
          className="mt-10 space-y-3 border-t pt-6 text-xs"
          style={{ borderColor: DOC.line }}
        >
          {invoice.terms && (
            <div>
              <div className="font-semibold uppercase tracking-wider" style={{ color: DOC.faint }}>
                Payment terms
              </div>
              <div className="mt-1" style={{ color: DOC.soft }}>
                {invoice.terms}
              </div>
            </div>
          )}
          {invoice.notes && (
            <div>
              <div className="font-semibold uppercase tracking-wider" style={{ color: DOC.faint }}>
                Notes
              </div>
              <div className="mt-1 whitespace-pre-line" style={{ color: DOC.soft }}>
                {invoice.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: DOC.soft }}>{label}</span>
      <span className="tabular font-medium" style={{ color: DOC.ink }}>
        {value}
      </span>
    </div>
  )
}
