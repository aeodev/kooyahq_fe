import type { Socket } from 'socket.io-client'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useAuthStore } from '@/stores/auth.store'
import type { TimeEntry } from '@/types/time-entry'

/**
 * Register socket handlers for time-entry module
 * Called when socket connects
 */
export function registerTimeEntryHandlers(socket: Socket, eventHandlers: Map<string, (...args: any[]) => void>): void {
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

  // Register and store time entry event handlers
  socket.on(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
  socket.on(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
  socket.on(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
  socket.on(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
  socket.on(SocketTimeEntriesEvents.CREATED, handleCreated)
  socket.on(SocketTimeEntriesEvents.UPDATED, handleUpdated)
  socket.on(SocketTimeEntriesEvents.DELETED, handleDeleted)
  socket.on(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)

  eventHandlers.set(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
  eventHandlers.set(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
  eventHandlers.set(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
  eventHandlers.set(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
  eventHandlers.set(SocketTimeEntriesEvents.CREATED, handleCreated)
  eventHandlers.set(SocketTimeEntriesEvents.UPDATED, handleUpdated)
  eventHandlers.set(SocketTimeEntriesEvents.DELETED, handleDeleted)
  eventHandlers.set(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)
}

