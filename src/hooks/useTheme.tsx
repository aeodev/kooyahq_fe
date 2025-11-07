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

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useThemeState()

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
