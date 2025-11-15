import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark'

const mediaQuery = '(prefers-color-scheme: dark)'

export function usePrefersColorScheme(): ColorScheme {
  const [scheme, setScheme] = useState<ColorScheme>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    return window.matchMedia(mediaQuery).matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const media = window.matchMedia(mediaQuery)
    const listener = (event: MediaQueryListEvent) => {
      setScheme(event.matches ? 'dark' : 'light')
    }

    setScheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  return scheme
}
