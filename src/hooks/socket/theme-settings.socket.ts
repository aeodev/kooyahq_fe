import type { Socket } from 'socket.io-client'
import { useThemeSettingsStore } from '@/stores/theme-settings.store'

/**
 * Register socket handlers for theme settings module
 * Called when socket connects
 */
export function registerThemeSettingsHandlers(socket: Socket, eventHandlers: Map<string, (...args: any[]) => void>): void {
  const handleThemeUpdated = (_data: { theme: { light: any; dark: any }; userId: string; timestamp: string }) => {
    // Update store with new theme
    const store = useThemeSettingsStore.getState()
    store.fetchThemeSettings()
    
    // Apply theme immediately with current mode
    const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    store.applyTheme(currentMode)
  }

  socket.on('settings:theme-updated', handleThemeUpdated)
  eventHandlers.set('settings:theme-updated', handleThemeUpdated)
}

