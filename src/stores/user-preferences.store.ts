import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axiosInstance from '@/utils/axios.instance'
import { GET_USER_PREFERENCES, UPDATE_USER_PREFERENCES } from '@/utils/api.routes'
import type { ThemeColors } from './theme-settings.store'

export type FontSize = 'small' | 'medium' | 'large'

export type UserPreferences = {
  themeColors?: {
    light?: ThemeColors | null
    dark?: ThemeColors | null
  }
  fontSize?: FontSize
  sidebarCollapsed?: boolean
}

type UserPreferencesState = {
  preferences: UserPreferences
  loading: boolean
  error: string | null
}

type UserPreferencesActions = {
  fetchPreferences: () => Promise<void>
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>
  applyPreferences: () => void
  resetPreferences: () => Promise<void>
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeColors: { light: null, dark: null },
  fontSize: 'medium',
  sidebarCollapsed: false,
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
}

export const useUserPreferencesStore = create<UserPreferencesState & UserPreferencesActions>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      loading: false,
      error: null,

      fetchPreferences: async () => {
        set({ loading: true, error: null })
        try {
          const response = await axiosInstance.get(GET_USER_PREFERENCES())
          const preferences = response.data.data || DEFAULT_PREFERENCES
          set({ preferences, loading: false })
          get().applyPreferences()
        } catch (error) {
          set({ error: 'Failed to fetch preferences', loading: false })
        }
      },

      updatePreferences: async (updates) => {
        set({ loading: true, error: null })
        try {
          const response = await axiosInstance.put(UPDATE_USER_PREFERENCES(), updates)
          const preferences = response.data.data || get().preferences
          set({ preferences, loading: false })
          get().applyPreferences()
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || 'Failed to update preferences'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },

      applyPreferences: () => {
        const { preferences } = get()
        const root = document.documentElement

        // Apply font size
        if (preferences.fontSize) {
          root.style.setProperty('--font-size-base', FONT_SIZE_MAP[preferences.fontSize])
        }

        // Theme colors are applied through useTheme composable based on themeMandatory flag
      },

      resetPreferences: async () => {
        set({ loading: true, error: null })
        try {
          await axiosInstance.put(UPDATE_USER_PREFERENCES(), {
            themeColors: { light: null, dark: null },
            fontSize: 'medium',
            sidebarCollapsed: false,
          })
          set({ preferences: DEFAULT_PREFERENCES, loading: false })
          get().applyPreferences()
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error?.message || 'Failed to reset preferences'
          set({ error: errorMessage, loading: false })
          throw error
        }
      },
    }),
    {
      name: 'kooyahq.user-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
)
