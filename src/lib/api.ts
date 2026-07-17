import { list, listSync, remove, save, saveSync } from '@/lib/storage'
import type { Client, Invoice, Settings } from '@/types'

/**
 * Resource accessors — the only place pages read/write data. Each async fn
 * returns a Promise so the UI gets real loading states (see storage.ts
 * simulated latency). The *Sync variants skip latency for cheap look-ups (the
 * current currency, a relation join) inside a component that already loaded its
 * main data.
 */

// Clients
export const getClients = () => list<Client>('clients')
export const getClientsSync = () => listSync<Client>('clients')
export const saveClient = (c: Client) => save<Client>('clients', c)
export const removeClient = (id: string) => remove('clients', id)

// Invoices
export const getInvoices = () => list<Invoice>('invoices')
export const getInvoicesSync = () => listSync<Invoice>('invoices')
export const saveInvoice = (inv: Invoice) => save<Invoice>('invoices', inv)
export const removeInvoice = (id: string) => remove('invoices', id)

// Settings (singleton)
export const getSettings = async (): Promise<Settings> => (await list<Settings>('settings'))[0]
export const getSettingsSync = (): Settings => listSync<Settings>('settings')[0]
export const saveSettings = (s: Settings) => save<Settings>('settings', s)

/**
 * Reserve the next invoice number (e.g. "LED-0043") and bump the counter in the
 * same tick, so two quick "New invoice" clicks never collide. Synchronous by
 * design — number assignment must be atomic with the settings write.
 */
export function reserveInvoiceNumber(): string {
  const s = getSettingsSync()
  const number = `${s.prefix}-${String(s.nextNumber).padStart(4, '0')}`
  saveSync<Settings>('settings', { ...s, nextNumber: s.nextNumber + 1 })
  return number
}
