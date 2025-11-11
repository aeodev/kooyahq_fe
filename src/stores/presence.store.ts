import { create } from 'zustand'
import type { PresenceUser } from '@/types/presence'

type PresenceState = {
  users: PresenceUser[]
  syncing: boolean
  permissionDenied: boolean
  geolocationSupported: boolean
}

type PresenceActions = {
  setUsers: (users: PresenceUser[]) => void
  setSyncing: (syncing: boolean) => void
  setPermissionDenied: (value: boolean) => void
  setGeolocationSupported: (value: boolean) => void
}

export const usePresenceStore = create<PresenceState & PresenceActions>((set) => ({
  users: [],
  syncing: false,
  permissionDenied: false,
  geolocationSupported: typeof window !== 'undefined' ? 'geolocation' in navigator : false,
  setUsers: (users) => set({ users }),
  setSyncing: (syncing) => set({ syncing }),
  setPermissionDenied: (permissionDenied) => set({ permissionDenied }),
  setGeolocationSupported: (geolocationSupported) => set({ geolocationSupported }),
}))
