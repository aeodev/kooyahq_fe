import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import {
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
import type { TimeEntry, StartTimerInput, UpdateTimeEntryInput, ManualEntryInput } from '@/types/time-entry'

type Errors = {
  message: string | string[]
  statusCode?: number
}

function normalizeError(error: unknown): Errors {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>

    if ('response' in anyError && anyError.response && typeof anyError.response === 'object') {
      const response = anyError.response as Record<string, unknown>
      const data = response.data as Record<string, unknown> | undefined
      const status = (response.status as number | undefined) ?? undefined

      if (data) {
        const message =
          (data.message as string | string[] | undefined) ??
          (data.error as string | undefined) ??
          'Request failed'
        return { message: message ?? 'Request failed', statusCode: status }
      }

      return {
        message: `Request failed with status ${status ?? 'unknown'}`,
        statusCode: status,
      }
    }

    if ('message' in anyError && typeof anyError.message === 'string') {
      return { message: anyError.message }
    }
  }

  return { message: 'Something went wrong' }
}

type TimeEntryState = {
  activeTimer: TimeEntry | null
  entries: TimeEntry[]
  loading: {
    activeTimer: boolean
    entries: boolean
  }
  errors: {
    activeTimer: Errors | null
    entries: Errors | null
  }
}

type TimeEntryActions = {
  fetchActiveTimer: () => Promise<TimeEntry | null>
  fetchEntries: () => Promise<TimeEntry[]>
  startTimer: (input: StartTimerInput) => Promise<TimeEntry | null>
  addTaskToTimer: (task: string) => Promise<TimeEntry | null>
  pauseTimer: () => Promise<TimeEntry | null>
  resumeTimer: () => Promise<TimeEntry | null>
  stopTimer: () => Promise<TimeEntry | null>
  endDay: () => Promise<TimeEntry[]>
  checkDayEndedStatus: () => Promise<{ dayEnded: boolean; endedAt: string | null }>
  logManualEntry: (input: ManualEntryInput) => Promise<TimeEntry | null>
  updateEntry: (id: string, updates: UpdateTimeEntryInput) => Promise<TimeEntry | null>
  deleteEntry: (id: string) => Promise<boolean>
  setActiveTimer: (timer: TimeEntry | null) => void
  updateTimerDuration: () => void
}

type TimeEntryStore = TimeEntryState & TimeEntryActions

export const useTimeEntryStore = create<TimeEntryStore>((set, get) => ({
  activeTimer: null,
  entries: [],
  loading: {
    activeTimer: false,
    entries: false,
  },
  errors: {
    activeTimer: null,
    entries: null,
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

      // Refresh entries after stopping timer
      get().fetchEntries()

      return timer
    } catch (err) {
      return null
    }
  },

  endDay: async () => {
    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry[] }>(END_DAY())
      const entries = response.data.data || []
      set({ activeTimer: null })

      // Refresh entries
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

      // Don't add here - let fetchEntries() refresh the list to avoid race condition with socket
      // The caller (handleAddManualEntry) will call fetchEntries() after this

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

      // Update in entries list
      set({
        entries: get().entries.map((e) => (e.id === id ? updatedEntry : e)),
      })

      // Update active timer if it's the one being updated
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

      // Remove from entries list
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

  updateTimerDuration: () => {
    // This will be handled by the useTimerDuration hook
    // But we can update the activeTimer reference if needed
    const timer = get().activeTimer
    if (timer && timer.isActive) {
      // Timer duration is computed on the fly, no need to update here
    }
  },
}))

