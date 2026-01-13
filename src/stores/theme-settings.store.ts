import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import { GET_THEME_SETTINGS, UPDATE_THEME_SETTINGS, UPDATE_THEME_MANDATORY } from '@/utils/api.routes'

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

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  light: {
    primary: "162 34% 46%",
    secondary: "162 29% 50%",
    accent: "141 33% 67%",
    destructive: "0 79% 60%",
    muted: "150 25% 97%",
    background: "0 3% 94%",
    foreground: "0 2% 37%",
    border: "150 1% 66%",
  },
  dark: {
    primary: "170 34% 53%",
    secondary: "157 56% 41%",
    accent: "150 56% 56%",
    destructive: "0 72% 59%",
    muted: "150 4% 20%",
    background: "180 2% 12%",
    foreground: "158 11% 86%",
    border: "180 25% 14%",
  },
}

type ThemeSettingsState = {
  settings: ThemeSettings | null
  themeMandatory: boolean
  loading: boolean
  error: string | null
}

type ThemeSettingsActions = {
  fetchThemeSettings: () => Promise<void>
  updateThemeSettings: (settings: ThemeSettings) => Promise<void>
  updateThemeMandatory: (mandatory: boolean) => Promise<void>
  applyTheme: (mode: 'light' | 'dark') => void
}

export const useThemeSettingsStore = create<ThemeSettingsState & ThemeSettingsActions>((set, get) => ({
  settings: null,
  themeMandatory: false,
  loading: false,
  error: null,

  fetchThemeSettings: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_THEME_SETTINGS())
      const { light, dark, themeMandatory } = response.data.data
      set({ 
        settings: { light, dark }, 
        themeMandatory: themeMandatory ?? false,
        loading: false 
      })
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
      const { light, dark, themeMandatory } = response.data.data
      set({ 
        settings: { light, dark }, 
        themeMandatory: themeMandatory ?? get().themeMandatory,
        loading: false 
      })
      // Apply immediately after update
      const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      get().applyTheme(currentMode)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update theme settings'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  updateThemeMandatory: async (mandatory) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.put(UPDATE_THEME_MANDATORY(), { themeMandatory: mandatory })
      const { themeMandatory } = response.data.data
      set({ themeMandatory: themeMandatory ?? mandatory, loading: false })
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update theme mandatory setting'
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

