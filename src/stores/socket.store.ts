import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import { SOCKET_TIME_ENTRIES, SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useAuthStore } from './auth.store'
import { useTimeEntryStore } from './time-entry.store'
import type { TimeEntry } from '@/types/time-entry'

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

    // Listen for time entry events
    const handleTimerStarted = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // If it's our own timer, update activeTimer
      if (data.userId === user?.id) {
        timeEntryStore.setActiveTimer(data.entry)
      }
    }

    const handleTimerStopped = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // If it's our own timer, clear it and refresh entries
      if (data.userId === user?.id) {
        timeEntryStore.setActiveTimer(null)
        timeEntryStore.fetchEntries()
      }
    }

    const handleTimerPaused = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // If it's our own timer, update it
      if (data.userId === user?.id) {
        timeEntryStore.setActiveTimer(data.entry)
      }
    }

    const handleTimerResumed = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // If it's our own timer, update it
      if (data.userId === user?.id) {
        timeEntryStore.setActiveTimer(data.entry)
      }
    }

    const handleCreated = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // If it's our own entry, add to entries list
      if (data.userId === user?.id) {
        const entries = timeEntryStore.entries
        // Avoid duplicates
        if (!entries.find(e => e.id === data.entry.id)) {
          // Add entry by setting state directly (Zustand allows this)
          useTimeEntryStore.setState({ entries: [...entries, data.entry] })
        }
      }
    }

    const handleUpdated = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // Update in entries list if it's ours
      if (data.userId === user?.id) {
        const entries = timeEntryStore.entries.map(e => 
          e.id === data.entry.id ? data.entry : e
        )
        useTimeEntryStore.setState({ entries })
        
        // Update active timer if it's the one being updated
        if (timeEntryStore.activeTimer?.id === data.entry.id) {
          timeEntryStore.setActiveTimer(data.entry)
        }
      }
    }

    const handleDeleted = (data: { id: string; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // Remove from entries list if it's ours
      if (data.userId === user?.id) {
        const entries = timeEntryStore.entries.filter(e => e.id !== data.id)
        useTimeEntryStore.setState({ entries })
        
        // Clear active timer if it was deleted
        if (timeEntryStore.activeTimer?.id === data.id) {
          timeEntryStore.setActiveTimer(null)
        }
      }
    }

    const handleTimerHeartbeat = (data: { entry: TimeEntry; userId: string }) => {
      const timeEntryStore = useTimeEntryStore.getState()
      const { user } = useAuthStore.getState()
      
      // Update active timer if it's ours - this syncs the timer with server state
      if (data.userId === user?.id && data.entry.isActive) {
        timeEntryStore.setActiveTimer(data.entry)
      }
    }

    // Register and store time entry event handlers (Fix 1)
    socketInstance.on(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
    socketInstance.on(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
    socketInstance.on(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
    socketInstance.on(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
    socketInstance.on(SocketTimeEntriesEvents.CREATED, handleCreated)
    socketInstance.on(SocketTimeEntriesEvents.UPDATED, handleUpdated)
    socketInstance.on(SocketTimeEntriesEvents.DELETED, handleDeleted)
    socketInstance.on(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)

    eventHandlers.set(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
    eventHandlers.set(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
    eventHandlers.set(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
    eventHandlers.set(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
    eventHandlers.set(SocketTimeEntriesEvents.CREATED, handleCreated)
    eventHandlers.set(SocketTimeEntriesEvents.UPDATED, handleUpdated)
    eventHandlers.set(SocketTimeEntriesEvents.DELETED, handleDeleted)
    eventHandlers.set(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)

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

