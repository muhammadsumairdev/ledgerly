/** Domain model for Ledgerly. These interfaces are the contract the whole app
 *  (pages, api layer, seed data) shares. */

/** What is persisted on an invoice. `overdue` is never stored — it is derived
 *  from a `sent` invoice whose due date has passed (see effectiveStatus). */
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

/** Status as shown in the UI — the stored status plus the computed `overdue`. */
export type DisplayStatus = InvoiceStatus | 'overdue'

export interface LineItem {
  id: string
  description: string
  qty: number
  /** Unit price in the invoice's currency (major units, e.g. 85.00). */
  rate: number
  /** Whether the invoice tax rate applies to this line. */
  taxable: boolean
}

export interface Invoice {
  id: string
  /** Human number, e.g. "LED-0043". Assigned from settings on creation. */
  number: string
  clientId: string
  issueDate: string // ISO date (yyyy-mm-dd)
  dueDate: string // ISO date
  status: InvoiceStatus
  lineItems: LineItem[]
  /** Flat discount amount in major units, applied to the subtotal. */
  discount: number
  /** Tax rate percent applied to taxable lines (after discount). */
  taxRate: number
  /** ISO datetime a payment was recorded, or null. */
  paidAt: string | null
  notes: string
  /** Payment terms line shown on the document (e.g. "Net 30 — bank transfer"). */
  terms: string
  createdAt: string
}

export interface Client {
  id: string
  name: string
  company: string
  email: string
  address: string
  avatar: string
}

export interface Settings {
  /** Singleton — always the string 'settings'. */
  id: string
  businessName: string
  addressLine: string
  email: string
  phone: string
  /** Small user-uploaded logo as a data URL, or null. The only base64 exception. */
  logo: string | null
  /** Invoice number prefix, e.g. "LED". */
  prefix: string
  /** Next sequential number to assign. */
  nextNumber: number
  /** ISO 4217 code, e.g. "USD". Drives all money formatting. */
  currency: string
  /** Default tax rate percent for new invoices. */
  defaultTaxRate: number
}
