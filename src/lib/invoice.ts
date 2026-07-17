import type { DisplayStatus, Invoice, LineItem } from '@/types'

/** Round to 2 decimal places, nudging past float error (0.1 + 0.2 etc). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface Totals {
  subtotal: number
  discount: number
  /** Taxable base after the discount is proportionally applied. */
  taxableBase: number
  tax: number
  total: number
}

/**
 * The single source of truth for invoice money math. Discount is a flat amount
 * distributed proportionally across all lines, so tax is charged only on the
 * discounted value of taxable lines (the VAT-correct / ZATCA order).
 *
 * ponytail: flat discount; add a percent toggle when a client actually needs it.
 */
export function computeTotals(inv: Pick<Invoice, 'lineItems' | 'discount' | 'taxRate'>): Totals {
  const line = (li: LineItem) => (Number(li.qty) || 0) * (Number(li.rate) || 0)
  const subtotal = inv.lineItems.reduce((s, li) => s + line(li), 0)
  const taxableSubtotal = inv.lineItems.reduce((s, li) => s + (li.taxable ? line(li) : 0), 0)

  const discount = Math.min(Math.max(inv.discount || 0, 0), subtotal)
  const discountFactor = subtotal > 0 ? 1 - discount / subtotal : 0
  const taxableBase = taxableSubtotal * discountFactor
  const tax = taxableBase * ((inv.taxRate || 0) / 100)

  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    taxableBase: round2(taxableBase),
    tax: round2(tax),
    total: round2(subtotal - discount + tax),
  }
}

/** Grand total only — the value most callers actually want. */
export function invoiceTotal(inv: Pick<Invoice, 'lineItems' | 'discount' | 'taxRate'>): number {
  return computeTotals(inv).total
}

/** Local yyyy-mm-dd for "today" — the comparison anchor for overdue. */
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Stored status plus the derived `overdue` (a `sent` invoice past its due date). */
export function effectiveStatus(inv: Pick<Invoice, 'status' | 'dueDate'>, today = todayISO()): DisplayStatus {
  if (inv.status !== 'sent') return inv.status
  return inv.dueDate < today ? 'overdue' : 'sent'
}

/** Whole days between issue and payment — for the "avg days to payment" stat. */
export function daysToPayment(inv: Pick<Invoice, 'issueDate' | 'paidAt'>): number | null {
  if (!inv.paidAt) return null
  const ms = new Date(inv.paidAt).getTime() - new Date(inv.issueDate).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

// Dev-only self-check: fails loudly on any drift in the money math.
if (import.meta.env.DEV) {
  const li = (qty: number, rate: number, taxable = true): LineItem => ({
    id: 'x',
    description: '',
    qty,
    rate,
    taxable,
  })
  const near = (a: number, b: number) => Math.abs(a - b) < 0.005
  const t1 = computeTotals({ lineItems: [li(2, 100), li(1, 50, false)], discount: 0, taxRate: 10 })
  // subtotal 250, taxable 200, tax 20, total 270
  console.assert(
    near(t1.subtotal, 250) && near(t1.tax, 20) && near(t1.total, 270),
    'invoice math: base case',
    t1,
  )
  const t2 = computeTotals({ lineItems: [li(1, 100), li(1, 100, false)], discount: 100, taxRate: 10 })
  // subtotal 200, discount halves everything → taxable 50 → tax 5, total 105
  console.assert(near(t2.tax, 5) && near(t2.total, 105), 'invoice math: proportional discount', t2)
  const t3 = computeTotals({ lineItems: [], discount: 50, taxRate: 15 })
  console.assert(t3.total === 0 && t3.discount === 0, 'invoice math: empty guard', t3)
}
