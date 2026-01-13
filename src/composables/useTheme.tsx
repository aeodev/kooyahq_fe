import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from 'react'
import { type ColorScheme, usePrefersColorScheme } from './usePrefersColorScheme'
import { useThemeSettingsStore, type ThemeColors } from '@/stores/theme-settings.store'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import { useAuthStore } from '@/stores/auth.store'

const THEME_STORAGE_KEY = 'kooyahq-theme'

export type Theme = ColorScheme

type ThemeContextValue = {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function useThemeState() {
  const preferredScheme = usePrefersColorScheme()
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    return stored ?? preferredScheme
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Use requestAnimationFrame for smoother DOM updates
    requestAnimationFrame(() => {
      const root = window.document.documentElement
      root.classList.remove(theme === 'light' ? 'dark' : 'light')
      root.classList.add(theme)
      // Defer localStorage write to avoid blocking
      setTimeout(() => {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
      }, 0)
    })
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (!stored) {
      setTheme(preferredScheme)
    }
  }, [preferredScheme])

  const isDark = useMemo(() => theme === 'dark', [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
}

function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--secondary', colors.secondary)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--destructive', colors.destructive)
  root.style.setProperty('--muted', colors.muted)
  root.style.setProperty('--background', colors.background)
  root.style.setProperty('--foreground', colors.foreground)
  root.style.setProperty('--border', colors.border)
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useThemeState()
  const { fetchThemeSettings, settings, themeMandatory } = useThemeSettingsStore()
  const { fetchPreferences, preferences, applyPreferences } = useUserPreferencesStore()
  const user = useAuthStore((state) => state.user)

  // Fetch theme settings on mount
  useEffect(() => {
    fetchThemeSettings()
  }, [fetchThemeSettings])

  // Fetch user preferences when user is authenticated
  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user, fetchPreferences])

  // Apply theme when settings are loaded or theme mode changes
  // Priority: if themeMandatory is false AND user has custom colors, use user's colors
  // Otherwise, use system theme
  useEffect(() => {
    if (!settings) return

    const mode = value.theme
    const systemColors = mode === 'dark' ? settings.dark : settings.light
    const userColors = preferences.themeColors?.[mode]

    // If theme is mandatory OR user has no custom colors, use system theme
    if (themeMandatory || !userColors) {
      applyThemeColors(systemColors)
    } else {
      // User has custom colors and theme is not mandatory
      applyThemeColors(userColors)
    }
  }, [settings, value.theme, themeMandatory, preferences.themeColors])

  // Apply other user preferences (font size, etc.)
  useEffect(() => {
    if (user) {
      applyPreferences()
    }
  }, [user, preferences, applyPreferences])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
