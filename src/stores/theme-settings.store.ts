import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import { GET_THEME_SETTINGS, UPDATE_THEME_SETTINGS } from '@/utils/api.routes'

export type ThemeColors = {
  primary: string
  secondary: string
  accent: string
  destructive: string
  muted: string
  background: string
  foreground: string
  border: string
}

export type ThemeSettings = {
  light: ThemeColors
  dark: ThemeColors
}

type ThemeSettingsState = {
  settings: ThemeSettings | null
  loading: boolean
  error: string | null
}

type ThemeSettingsActions = {
  fetchThemeSettings: () => Promise<void>
  updateThemeSettings: (settings: ThemeSettings) => Promise<void>
  applyTheme: (mode: 'light' | 'dark') => void
}

export const useThemeSettingsStore = create<ThemeSettingsState & ThemeSettingsActions>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchThemeSettings: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_THEME_SETTINGS())
      set({ settings: response.data.data, loading: false })
      // Apply theme after fetching
      const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      get().applyTheme(currentMode)
    } catch (error) {
      set({ error: 'Failed to fetch theme settings', loading: false })
    }
  },

  updateThemeSettings: async (settings) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.put(UPDATE_THEME_SETTINGS(), settings)
      set({ settings: response.data.data, loading: false })
      // Apply immediately after update
      const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      get().applyTheme(currentMode)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update theme settings'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  applyTheme: (mode) => {
    const { settings } = get()
    if (!settings) return

    const colors = mode === 'dark' ? settings.dark : settings.light
    const root = document.documentElement

    root.style.setProperty('--primary', colors.primary)
    root.style.setProperty('--secondary', colors.secondary)
    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--destructive', colors.destructive)
    root.style.setProperty('--muted', colors.muted)
    root.style.setProperty('--background', colors.background)
    root.style.setProperty('--foreground', colors.foreground)
    root.style.setProperty('--border', colors.border)
  },
}))

