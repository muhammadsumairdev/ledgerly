import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from '@/lib/safeStorage'

export type ThemeMode = 'light' | 'dark' | 'system'

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** Resolve mode → boolean and reflect it on <html>. Called on change and on
 *  system-preference changes while in 'system' mode. */
export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        applyTheme(mode)
        set({ mode })
      },
    }),
    {
      name: 'ledgerly.v1.theme',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => applyTheme(state?.mode ?? 'system'),
    },
  ),
)

// Keep 'system' mode live when the OS preference flips.
if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (useTheme.getState().mode === 'system') applyTheme('system')
    })
}
