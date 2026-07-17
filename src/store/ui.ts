import { create } from 'zustand'

/**
 * Ephemeral app-wide UI state (not persisted): the global client form and a
 * data-version tick. Any mutation calls bumpData(); pages include `dataVersion`
 * in their useAsync deps so a change made anywhere (a drawer, another page)
 * refetches everywhere.
 */
interface UiState {
  clientFormOpen: boolean
  editingClientId: string | null
  openClientForm: (id?: string) => void
  closeClientForm: () => void

  dataVersion: number
  bumpData: () => void
}

export const useUi = create<UiState>((set) => ({
  clientFormOpen: false,
  editingClientId: null,
  openClientForm: (id) => set({ clientFormOpen: true, editingClientId: id ?? null }),
  closeClientForm: () => set({ clientFormOpen: false, editingClientId: null }),

  dataVersion: 0,
  bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}))
