import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isThisYear, parseISO } from 'date-fns'

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// One Intl formatter per currency, built lazily and cached.
const moneyFmt = new Map<string, Intl.NumberFormat>()
function fmt(currency: string) {
  let f = moneyFmt.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    moneyFmt.set(currency, f)
  }
  return f
}

/** $1,240.00 — always two decimals, rendered in tabular numerals. */
export function formatMoney(value: number, currency = 'USD') {
  return fmt(currency).format(value)
}

/** Compact money for stat cards: $1.2M, $840K, $500. Keeps the currency symbol. */
export function formatCompactMoney(value: number, currency = 'USD') {
  const sym = formatMoney(0, currency).replace(/[\d.,\s]/g, '') || '$'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  // 999_500 rounds up to "1.0M" (not "1000K"); 999_499 stays "999K".
  if (abs >= 999_500) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${sym}${Math.round(abs / 1_000)}K`
  return `${sign}${sym}${Math.round(abs)}`
}

/** "Mar 4, 2026" — full, for invoice documents and detail rows. */
export function formatDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy')
}

/** "Mar 4" this year, "Mar 4, 2024" otherwise — compact table cells. */
export function formatDateShort(iso: string) {
  const d = parseISO(iso)
  return format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yyyy')
}

/** "3 days ago" — for relative timestamps. */
export function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

/** "AB" from "Ava Bennett" — avatar fallbacks. */
export function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Prefix + random suffix id, e.g. inv_k3f9a2. Unique enough for a demo. */
export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Client-side CSV export via a Blob download. `rows` are plain objects; column
 * order follows `columns` (label + accessor).
 */
export function downloadCsv<T>(
  filename: string,
  columns: { header: string; value: (row: T) => string | number }[],
  rows: T[],
) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = columns.map((c) => esc(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n')
  const blob = new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
