import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import { SOCKET_TIME_ENTRIES } from '@/utils/api.routes'
import { useAuthStore } from './auth.store'
import { registerTimeEntryHandlers } from '@/hooks/socket/time-entry.socket'
import { registerNotificationHandlers } from '@/hooks/socket/notification.socket'
import { registerTicketHandlers } from '@/hooks/socket/ticket.socket'
import { registerAIAssistantHandlers } from '@/hooks/socket/ai-assistant.socket'
import { registerThemeSettingsHandlers } from '@/hooks/socket/theme-settings.socket'

type SocketState = {
  socket: Socket | null
  connected: boolean
  connecting: boolean
  error: string | null
}

type SocketActions = {
  connect: () => void
  disconnect: () => void
}

type SocketStore = SocketState & SocketActions

export const useSocketStore = create<SocketStore>((set) => {
  let socketInstance: Socket | null = null
  // Store event handler references for cleanup
  const eventHandlers: Map<string, (...args: any[]) => void> = new Map()

  const connect = () => {
    const { token } = useAuthStore.getState()
    
    if (!token) {
      console.warn('Cannot connect socket: no token')
      set({ error: 'No authentication token available' })
      return
    }

    // Fix 2: Always cleanup existing socket before creating new one
    // Clean up any existing socket and handlers before creating new instance
    if (socketInstance) {
      // Remove all event listeners first
      eventHandlers.forEach((handler, event) => {
        socketInstance!.off(event, handler)
      })
      eventHandlers.clear()
      
      // Disconnect the old socket
      socketInstance.disconnect()
      socketInstance = null
      set({ socket: null, connected: false, connecting: false, error: null })
    }

    set({ connecting: true, error: null })
    
    socketInstance = io(SOCKET_TIME_ENTRIES(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    // Fix 3: Validate token on reconnect attempts
    const handleReconnectAttempt = () => {
      const { token: currentToken } = useAuthStore.getState()
      if (!currentToken) {
        console.warn('Socket reconnection aborted: no token')
        socketInstance?.disconnect()
        set({ error: 'Authentication token expired. Please refresh the page.', connected: false })
        return
      }
      // Update auth with fresh token
      socketInstance!.auth = { token: currentToken }
    }

    const handleConnect = () => {
      console.log('Socket connected')
      set({ connected: true, connecting: false, error: null })
    }

    const handleDisconnect = () => {
      console.log('Socket disconnected')
      set({ connected: false, connecting: false })
    }

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error)
      set({ error: error.message, connecting: false, connected: false })
    }

    // Store and register base event handlers (Fix 1 & 4)
    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('connect_error', handleConnectError)
    socketInstance.on('reconnect_attempt', handleReconnectAttempt)

    eventHandlers.set('connect', handleConnect)
    eventHandlers.set('disconnect', handleDisconnect)
    eventHandlers.set('connect_error', handleConnectError)
    eventHandlers.set('reconnect_attempt', handleReconnectAttempt)

    // Register module-specific socket handlers
    registerTimeEntryHandlers(socketInstance, eventHandlers)
    registerNotificationHandlers(socketInstance, eventHandlers)
    registerTicketHandlers(socketInstance, eventHandlers, {})
    registerAIAssistantHandlers(socketInstance, eventHandlers)
    registerThemeSettingsHandlers(socketInstance, eventHandlers)

    set({ socket: socketInstance })
  }

  // Fix 1: Properly cleanup all event listeners before disconnecting
  const disconnect = () => {
    if (socketInstance) {
      // Remove all event listeners to prevent memory leaks
      eventHandlers.forEach((handler, event) => {
        socketInstance!.off(event, handler)
      })
      eventHandlers.clear()

      socketInstance.disconnect()
      socketInstance = null
      set({ socket: null, connected: false, connecting: false, error: null })
    }
  }

  return {
    socket: null,
    connected: false,
    connecting: false,
    error: null,
    connect,
    disconnect,
  }
})

