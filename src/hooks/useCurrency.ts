import { useMemo } from 'react'
import { getSettingsSync } from '@/lib/api'
import { useUi } from '@/store/ui'

/** The app currency, read synchronously from settings (always seeded) and
 *  refreshed whenever data changes (e.g. after saving Settings). */
export function useCurrency(): string {
  const dataVersion = useUi((s) => s.dataVersion)
  return useMemo(() => getSettingsSync()?.currency ?? 'USD', [dataVersion])
}
