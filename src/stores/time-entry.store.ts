import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_TIME_ENTRIES,
  GET_MY_TIME_ENTRIES,
  GET_ACTIVE_TIMER,
  START_TIMER,
  ADD_TASK_TO_TIMER,
  PAUSE_TIMER,
  RESUME_TIMER,
  STOP_TIMER,
  END_DAY,
  GET_DAY_ENDED_STATUS,
  LOG_MANUAL_ENTRY,
  UPDATE_TIME_ENTRY,
  DELETE_TIME_ENTRY,
} from '@/utils/api.routes'
import { normalizeError, type Errors } from '@/utils/error'
import type { TimeEntry, StartTimerInput, UpdateTimeEntryInput, ManualEntryInput } from '@/types/time-entry'
import { setPendingTimerStop, clearPendingTimerStop, hasPendingStop } from '@/utils/server-health'

type TimeEntryState = {
  activeTimer: TimeEntry | null
  entries: TimeEntry[]
  allTodayEntries: TimeEntry[]
  loading: {
    activeTimer: boolean
    entries: boolean
    allTodayEntries: boolean
  }
  errors: {
    activeTimer: Errors | null
    entries: Errors | null
    allTodayEntries: Errors | null
  }
}

type TimeEntryActions = {
  fetchActiveTimer: () => Promise<TimeEntry | null>
  fetchEntries: () => Promise<TimeEntry[]>
  fetchAllTodayEntries: () => Promise<TimeEntry[]>
  startTimer: (input: StartTimerInput) => Promise<TimeEntry | null>
  addTaskToTimer: (task: string) => Promise<TimeEntry | null>
  pauseTimer: () => Promise<TimeEntry | null>
  resumeTimer: () => Promise<TimeEntry | null>
  stopTimer: () => Promise<TimeEntry | null>
  emergencyStopTimer: () => Promise<void>
  completePendingStop: () => Promise<boolean>
  endDay: () => Promise<TimeEntry[]>
  checkDayEndedStatus: () => Promise<{ dayEnded: boolean; endedAt: string | null }>
  logManualEntry: (input: ManualEntryInput) => Promise<TimeEntry | null>
  updateEntry: (id: string, updates: UpdateTimeEntryInput) => Promise<TimeEntry | null>
  deleteEntry: (id: string) => Promise<boolean>
  setActiveTimer: (timer: TimeEntry | null) => void
  setActiveTimerIfNotPending: (timer: TimeEntry | null) => void
  updateTimerDuration: () => void
}

type TimeEntryStore = TimeEntryState & TimeEntryActions

export const useTimeEntryStore = create<TimeEntryStore>((set, get) => ({
  activeTimer: null,
  entries: [],
  allTodayEntries: [],
  loading: {
    activeTimer: false,
    entries: false,
    allTodayEntries: false,
  },
  errors: {
    activeTimer: null,
    entries: null,
    allTodayEntries: null,
  },

  fetchActiveTimer: async () => {
    set({
      loading: { ...get().loading, activeTimer: true },
      errors: { ...get().errors, activeTimer: null },
    })

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry | null }>(
        GET_ACTIVE_TIMER()
      )
      const timer = response.data.data
      set({
        activeTimer: timer,
        loading: { ...get().loading, activeTimer: false },
      })
      return timer
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: { ...get().errors, activeTimer: normalized },
        loading: { ...get().loading, activeTimer: false },
      })
      return null
    }
  },

  fetchEntries: async () => {
    set({
      loading: { ...get().loading, entries: true },
      errors: { ...get().errors, entries: null },
    })

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(
        GET_MY_TIME_ENTRIES()
      )
      const entries = response.data.data
      set({
        entries,
        loading: { ...get().loading, entries: false },
      })
      return entries
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: { ...get().errors, entries: normalized },
        loading: { ...get().loading, entries: false },
      })
      return []
    }
  },

  fetchAllTodayEntries: async () => {
    set({
      loading: { ...get().loading, allTodayEntries: true },
      errors: { ...get().errors, allTodayEntries: null },
    })

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(
        GET_TIME_ENTRIES()
      )
      const allTodayEntries = response.data.data
      set({
        allTodayEntries,
        loading: { ...get().loading, allTodayEntries: false },
      })
      return allTodayEntries
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: { ...get().errors, allTodayEntries: normalized },
        loading: { ...get().loading, allTodayEntries: false },
      })
      return []
    }
  },

  startTimer: async (input: StartTimerInput) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(
        START_TIMER(),
        input
      )
      const timer = response.data.data
      set({ activeTimer: timer })
      return timer
    } catch (err) {
      return null
    }
  },

  addTaskToTimer: async (task: string) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(
        ADD_TASK_TO_TIMER(),
        { task }
      )
      const timer = response.data.data
      set({ activeTimer: timer })
      return timer
    } catch (err) {
      return null
    }
  },

  pauseTimer: async () => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(PAUSE_TIMER())
      const timer = response.data.data
      set({ activeTimer: timer })
      return timer
    } catch (err) {
      return null
    }
  },

  resumeTimer: async () => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(
        RESUME_TIMER()
      )
      const timer = response.data.data
      set({ activeTimer: timer })
      return timer
    } catch (err) {
      return null
    }
  },

  stopTimer: async () => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(STOP_TIMER())
      const timer = response.data.data
      set({ activeTimer: null })

      get().fetchEntries()

      return timer
    } catch (err) {
      return null
    }
  },

  emergencyStopTimer: async () => {
    const activeTimer = get().activeTimer
    if (!activeTimer) return

    console.warn('[TimeEntryStore] Emergency stopping timer due to server unavailability')

    setPendingTimerStop(activeTimer.id)

    set({ activeTimer: null })

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      await axiosInstance.post(STOP_TIMER(), {}, { signal: controller.signal })
      
      clearTimeout(timeoutId)
      
      clearPendingTimerStop()
      get().fetchEntries()
    } catch {
      console.warn('[TimeEntryStore] Could not notify server of emergency stop - will retry when server is available')
    }
  },

  completePendingStop: async () => {
    try {
      await axiosInstance.post<{ status: string; data: TimeEntry }>(STOP_TIMER())
      
      clearPendingTimerStop()
      set({ activeTimer: null })
      get().fetchEntries()
      
      console.log('[TimeEntryStore] Successfully completed pending timer stop on server')
      return true
    } catch {
      console.warn('[TimeEntryStore] Failed to complete pending timer stop')
      return false
    }
  },

  endDay: async () => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry[] }>(END_DAY())
      const entries = response.data.data || []
      set({ activeTimer: null })

      get().fetchEntries()

      return entries
    } catch (err) {
      return []
    }
  },

  checkDayEndedStatus: async () => {
    try {
      const response = await axiosInstance.get<{ status: string; data: { dayEnded: boolean; endedAt: string | null } }>(
        GET_DAY_ENDED_STATUS()
      )
      return response.data.data
    } catch (err) {
      return { dayEnded: false, endedAt: null }
    }
  },

  logManualEntry: async (input: ManualEntryInput) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(
        LOG_MANUAL_ENTRY(),
        input
      )
      const entry = response.data.data

      return entry
    } catch (err) {
      return null
    }
  },

  updateEntry: async (id: string, updates: UpdateTimeEntryInput) => {
    try {
      const response = await axiosInstance.put<{ status: string; data: TimeEntry }>(
        UPDATE_TIME_ENTRY(id),
        updates
      )
      const updatedEntry = response.data.data

      set({
        entries: get().entries.map((e) => (e.id === id ? updatedEntry : e)),
      })

      if (get().activeTimer?.id === id) {
        set({ activeTimer: updatedEntry })
      }

      return updatedEntry
    } catch (err) {
      return null
    }
  },

  deleteEntry: async (id: string) => {
    try {
      await axiosInstance.delete(DELETE_TIME_ENTRY(id))

      set({
        entries: get().entries.filter((e) => e.id !== id),
      })

      return true
    } catch (err) {
      return false
    }
  },

  setActiveTimer: (timer: TimeEntry | null) => {
    set({ activeTimer: timer })
  },

  setActiveTimerIfNotPending: (timer: TimeEntry | null) => {
    if (timer && hasPendingStop(timer.id)) {
      console.log('[TimeEntryStore] Ignoring timer update - pending stop for this timer')
      return
    }
    set({ activeTimer: timer })
  },

  updateTimerDuration: () => {
    const timer = get().activeTimer
    if (timer && timer.isActive) {
    }
  },
}))
