import type { Socket } from 'socket.io-client'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useAuthStore } from '@/stores/auth.store'
import { useProjectTaskStore } from '@/stores/project-task.store'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import type { TimeEntry } from '@/types/time-entry'

export function registerTimeEntryHandlers(socket: Socket, eventHandlers: Map<string, (...args: any[]) => void>): void {
  const handleTimerStarted = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const projectTaskStore = useProjectTaskStore.getState()
    const aiAssistantStore = useAIAssistantStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    timeEntryStore.updateAllTodayEntry(data.entry)
    
    if (data.userId === user?.id) {
      timeEntryStore.setActiveTimerIfNotPending(data.entry)
      
      const existingProjects = projectTaskStore.selectedProjects.length > 0
        ? projectTaskStore.selectedProjects
        : (aiAssistantStore.selectedProjects.length > 0 
          ? aiAssistantStore.selectedProjects 
          : (data.entry.projects || []))
      
      if (existingProjects.length > 0) {
        projectTaskStore.setSelectedProjects(existingProjects)
        // Use the project from the timer entry, not existingProjects[0]
        const timerProject = data.entry.projects?.[0]
        if (timerProject) {
          projectTaskStore.setActiveProject(timerProject)
        } else if (existingProjects.length > 0) {
          projectTaskStore.setActiveProject(existingProjects[0])
        }
      }
    }
  }

  const handleTimerStopped = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    timeEntryStore.updateAllTodayEntry(data.entry)
    
    if (data.userId === user?.id) {
      timeEntryStore.setActiveTimer(null)
      timeEntryStore.fetchEntries()
    }
  }

  const handleTimerPaused = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    timeEntryStore.updateAllTodayEntry(data.entry)
    
    if (data.userId === user?.id) {
      timeEntryStore.setActiveTimerIfNotPending(data.entry)
    }
  }

  const handleTimerResumed = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    timeEntryStore.updateAllTodayEntry(data.entry)
    
    if (data.userId === user?.id) {
      timeEntryStore.setActiveTimerIfNotPending(data.entry)
    }
  }

  const handleCreated = (data: { entry: TimeEntry; userId: string }) => {
    const { user } = useAuthStore.getState()
    
    if (data.userId === user?.id) {
      useTimeEntryStore.getState().fetchEntries()
    }
  }

  const handleUpdated = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    timeEntryStore.updateAllTodayEntry(data.entry)
    
    if (data.userId === user?.id) {
      const entries = timeEntryStore.entries.map(e => 
        e.id === data.entry.id ? data.entry : e
      )
      useTimeEntryStore.setState({ entries })
      
      if (timeEntryStore.activeTimer?.id === data.entry.id) {
        timeEntryStore.setActiveTimer(data.entry)
      }
    }
  }

  const handleDeleted = (data: { id: string; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Remove from allTodayEntries for ALL users (for active users display)
    timeEntryStore.removeFromAllTodayEntries(data.id)
    
    if (data.userId === user?.id) {
      const entries = timeEntryStore.entries.filter(e => e.id !== data.id)
      useTimeEntryStore.setState({ entries })
      
      if (timeEntryStore.activeTimer?.id === data.id) {
        timeEntryStore.setActiveTimer(null)
      }
    }
  }

  const handleTimerHeartbeat = (data: { entry: TimeEntry; userId: string }) => {
    const timeEntryStore = useTimeEntryStore.getState()
    const { user } = useAuthStore.getState()
    
    // Update allTodayEntries for ALL users (for active users display)
    if (data.entry.isActive) {
      timeEntryStore.updateAllTodayEntry(data.entry)
    }
    
    if (data.userId === user?.id && data.entry.isActive) {
      timeEntryStore.setActiveTimerIfNotPending(data.entry)
    }
  }
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

