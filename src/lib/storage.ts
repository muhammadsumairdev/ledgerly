import seedClients from '@/seed/clients.json'
import seedInvoices from '@/seed/invoices.json'
import seedSettings from '@/seed/settings.json'

/**
 * API-shaped data layer. The UI must never touch localStorage directly — all
 * resource access goes through this module (via lib/api.ts), which behaves like
 * an async API client with real loading states and simulated latency. Swapping
 * in a real backend (Laravel, Node, ZATCA gateway) later is a one-file change.
 */

const VERSION = 'v1'
const key = (name: string) => `ledgerly.${VERSION}.${name}`

const SEEDS: Record<string, unknown[]> = {
  clients: seedClients,
  invoices: seedInvoices,
  // settings is a singleton collection (an array of one record).
  settings: [seedSettings],
}

/** Safari private mode blocks localStorage — fall back to an in-memory map. */
const memory = new Map<string, string>()

function read(name: string): string | null {
  try {
    return localStorage.getItem(key(name))
  } catch {
    return memory.get(key(name)) ?? null
  }
}

function write(name: string, value: string) {
  try {
    localStorage.setItem(key(name), value)
  } catch {
    memory.set(key(name), value)
  }
}

function seedIfEmpty(name: string) {
  if (read(name) === null) {
    write(name, JSON.stringify(SEEDS[name] ?? []))
  }
}

const latency = () => new Promise((r) => setTimeout(r, 200 + Math.random() * 300))

export async function list<T>(name: string): Promise<T[]> {
  seedIfEmpty(name)
  await latency()
  return JSON.parse(read(name) ?? '[]') as T[]
}

/** Read without latency — for internal composition (currency, relation joins). */
export function listSync<T>(name: string): T[] {
  seedIfEmpty(name)
  return JSON.parse(read(name) ?? '[]') as T[]
}

export async function save<T extends { id: string }>(name: string, record: T): Promise<T> {
  const all = listSync<T>(name)
  const i = all.findIndex((r) => r.id === record.id)
  if (i === -1) all.push(record)
  else all[i] = record
  write(name, JSON.stringify(all))
  await latency()
  return record
}

/** Persist without latency — used when two records must change atomically
 *  (assigning an invoice number bumps settings.nextNumber in the same tick). */
export function saveSync<T extends { id: string }>(name: string, record: T): T {
  const all = listSync<T>(name)
  const i = all.findIndex((r) => r.id === record.id)
  if (i === -1) all.push(record)
  else all[i] = record
  write(name, JSON.stringify(all))
  return record
}

export async function remove(name: string, id: string): Promise<void> {
  const all = listSync<{ id: string }>(name)
  write(name, JSON.stringify(all.filter((r) => r.id !== id)))
  await latency()
}

export function resetDemo() {
  Object.keys(SEEDS).forEach((name) => {
    try {
      localStorage.removeItem(key(name))
    } catch {
      memory.delete(key(name))
    }
  })
  location.reload()
}
