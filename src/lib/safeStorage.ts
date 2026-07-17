import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage that degrades to an in-memory map when blocked (Safari private
 * mode). Used by the zustand-persisted theme store.
 */
const mem = new Map<string, string>()

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return mem.get(name) ?? null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      mem.set(name, value)
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      mem.delete(name)
    }
  },
}
