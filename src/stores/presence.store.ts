import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PresenceUser } from '@/types/presence'

type PresenceState = {
  users: PresenceUser[]
  syncing: boolean
  permissionDenied: boolean
  geolocationSupported: boolean
  locationSharingEnabled: boolean
}

type PresenceActions = {
  setUsers: (users: PresenceUser[]) => void
  setSyncing: (syncing: boolean) => void
  setPermissionDenied: (value: boolean) => void
  setGeolocationSupported: (value: boolean) => void
  setLocationSharingEnabled: (enabled: boolean) => void
}

export const usePresenceStore = create<PresenceState & PresenceActions>()(
  persist(
    (set) => ({
      users: [],
      syncing: false,
      permissionDenied: false,
      geolocationSupported: typeof window !== 'undefined' ? 'geolocation' in navigator : false,
      locationSharingEnabled: false,
      setUsers: (users) => set({ users }),
      setSyncing: (syncing) => set({ syncing }),
      setPermissionDenied: (permissionDenied) => set({ permissionDenied }),
      setGeolocationSupported: (geolocationSupported) => set({ geolocationSupported }),
      setLocationSharingEnabled: (locationSharingEnabled) => set({ locationSharingEnabled }),
    }),
    {
      name: 'presence-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ locationSharingEnabled: state.locationSharingEnabled }),
    }
  )
)
