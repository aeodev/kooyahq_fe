import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Types
type UserPreferencesState = {
  heyKooyaEnabled: boolean
}

type UserPreferencesActions = {
  setHeyKooyaEnabled: (enabled: boolean) => void
  toggleHeyKooya: () => void
}

type UserPreferencesStore = UserPreferencesState & UserPreferencesActions

const initialState: UserPreferencesState = {
  heyKooyaEnabled: true, // Default to enabled
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHeyKooyaEnabled: (enabled: boolean) => set({ heyKooyaEnabled: enabled }),

      toggleHeyKooya: () => set((state) => ({ heyKooyaEnabled: !state.heyKooyaEnabled })),
    }),
    {
      name: 'kooyahq.user-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
