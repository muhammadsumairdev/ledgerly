import type { DisplayStatus } from '@/types'

/** Status vocabulary — hard hexes (not theme tokens) so a status reads the same
 *  colour in light and dark. `soft` is the pill background. */
export const STATUS_META: Record<
  DisplayStatus,
  { label: string; color: string; soft: string }
> = {
  draft: { label: 'Draft', color: '#64748B', soft: 'rgba(100,116,139,0.12)' },
  sent: { label: 'Sent', color: '#3B82F6', soft: 'rgba(59,130,246,0.12)' },
  paid: { label: 'Paid', color: '#0E9F6E', soft: 'rgba(14,159,110,0.12)' },
  overdue: { label: 'Overdue', color: '#DC2626', soft: 'rgba(220,38,38,0.12)' },
}

/** Filter / donut order. */
export const STATUS_ORDER: DisplayStatus[] = ['draft', 'sent', 'overdue', 'paid']

/**
 * The invoice document's own fixed palette. A printed invoice is always on
 * white paper, so the document never uses the app theme tokens.
 */
export const DOC = {
  paper: '#ffffff',
  ink: '#0a2540',
  soft: '#475569',
  faint: '#94a3b8',
  line: '#e2e8f0',
  accent: '#0e9f6e',
  accentSoft: '#ecfdf5',
} as const
