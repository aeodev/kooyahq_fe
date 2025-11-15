import { useCallback, useState, useEffect, useRef } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { useSocketStore } from '@/stores/socket.store'
import { SocketTimeEntriesEvents } from '@/utils/api.routes'
import {
  GET_TIME_ENTRIES,
  GET_MY_TIME_ENTRIES,
  GET_ANALYTICS,
  GET_ACTIVE_TIMER,
  START_TIMER,
  PAUSE_TIMER,
  RESUME_TIMER,
  STOP_TIMER,
  END_DAY,
  LOG_MANUAL_ENTRY,
  UPDATE_TIME_ENTRY,
  DELETE_TIME_ENTRY,
} from '@/utils/api.routes'
import type { TimeEntry, StartTimerInput, UpdateTimeEntryInput, ManualEntryInput } from '@/types/time-entry'

export type Errors = {
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

export const useTimeEntries = () => {
  const [data, setData] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)
  const socket = useSocketStore((state) => state.socket)

  const fetchEntries = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(GET_TIME_ENTRIES())
      setData(response.data.data)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Listen for real-time updates via socket
  useEffect(() => {
    if (!socket?.connected) return

    const handleTimerStarted = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        // Remove any existing active timer for this user, then add new one
        const filtered = prev.filter(e => !(e.userId === payload.userId && e.isActive))
        return [...filtered, payload.entry]
      })
    }

    const handleTimerStopped = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        // Update the entry that was stopped
        return prev.map(e => e.id === payload.entry.id ? payload.entry : e)
      })
    }

    const handleTimerPaused = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        return prev.map(e => e.id === payload.entry.id ? payload.entry : e)
      })
    }

    const handleTimerResumed = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        return prev.map(e => e.id === payload.entry.id ? payload.entry : e)
      })
    }

    const handleCreated = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        // Avoid duplicates
        if (prev.find(e => e.id === payload.entry.id)) return prev
        return [...prev, payload.entry]
      })
    }

    const handleUpdated = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        return prev.map(e => e.id === payload.entry.id ? payload.entry : e)
      })
    }

    const handleDeleted = (payload: { id: string; userId: string }) => {
      setData((prev) => {
        return prev.filter(e => e.id !== payload.id)
      })
    }

    const handleTimerHeartbeat = (payload: { entry: TimeEntry; userId: string }) => {
      setData((prev) => {
        // Update the entry if it exists, otherwise add it
        const existingIndex = prev.findIndex(e => e.id === payload.entry.id)
        if (existingIndex >= 0) {
          // Update existing entry with server-calculated duration
          const updated = [...prev]
          updated[existingIndex] = payload.entry
          return updated
        } else if (payload.entry.isActive) {
          // Add new active timer
          return [...prev, payload.entry]
        }
        return prev
      })
    }

    socket.on(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
    socket.on(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
    socket.on(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
    socket.on(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
    socket.on(SocketTimeEntriesEvents.CREATED, handleCreated)
    socket.on(SocketTimeEntriesEvents.UPDATED, handleUpdated)
    socket.on(SocketTimeEntriesEvents.DELETED, handleDeleted)
    socket.on(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)

    return () => {
      socket.off(SocketTimeEntriesEvents.TIMER_STARTED, handleTimerStarted)
      socket.off(SocketTimeEntriesEvents.TIMER_STOPPED, handleTimerStopped)
      socket.off(SocketTimeEntriesEvents.TIMER_PAUSED, handleTimerPaused)
      socket.off(SocketTimeEntriesEvents.TIMER_RESUMED, handleTimerResumed)
      socket.off(SocketTimeEntriesEvents.CREATED, handleCreated)
      socket.off(SocketTimeEntriesEvents.UPDATED, handleUpdated)
      socket.off(SocketTimeEntriesEvents.DELETED, handleDeleted)
      socket.off(SocketTimeEntriesEvents.TIMER_HEARTBEAT, handleTimerHeartbeat)
    }
  }, [socket])

  return { data, loading, error, fetchEntries }
}

export const useMyTimeEntries = () => {
  const [data, setData] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchEntries = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(GET_MY_TIME_ENTRIES())
      setData(response.data.data)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return { data, loading, error, fetchEntries }
}

export const useActiveTimer = () => {
  const [data, setData] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchTimer = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry | null }>(GET_ACTIVE_TIMER())
      setData(response.data.data)
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTimer()
  }, [fetchTimer])

  return { data, loading, error, fetchTimer }
}

export const useStartTimer = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const startTimer = useCallback(async (input: StartTimerInput): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(START_TIMER(), input)
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { startTimer, loading, error }
}

export const usePauseTimer = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const pauseTimer = useCallback(async (): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(PAUSE_TIMER())
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { pauseTimer, loading, error }
}

export const useResumeTimer = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const resumeTimer = useCallback(async (): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(RESUME_TIMER())
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { resumeTimer, loading, error }
}

export const useStopTimer = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const stopTimer = useCallback(async (): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(STOP_TIMER())
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { stopTimer, loading, error }
}

export const useEndDay = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const endDay = useCallback(async (): Promise<TimeEntry[]> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry[] }>(END_DAY())
      return response.data.data || []
    } catch (err) {
      setError(normalizeError(err))
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { endDay, loading, error }
}

export const useLogManualEntry = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const logEntry = useCallback(async (input: ManualEntryInput): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: TimeEntry }>(LOG_MANUAL_ENTRY(), input)
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { logEntry, loading, error }
}

export const useUpdateTimeEntry = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateEntry = useCallback(async (id: string, updates: UpdateTimeEntryInput): Promise<TimeEntry | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.put<{ status: string; data: TimeEntry }>(UPDATE_TIME_ENTRY(id), updates)
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateEntry, loading, error }
}

export const useDeleteTimeEntry = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_TIME_ENTRY(id))
      return true
    } catch (err) {
      setError(normalizeError(err))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteEntry, loading, error }
}

// Hook for real-time timer updates
export const useTimerDuration = (activeTimer: TimeEntry | null) => {
  const [duration, setDuration] = useState<string>('00:00')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<TimeEntry | null>(activeTimer)

  // Update ref when activeTimer changes to ensure we always have latest value
  useEffect(() => {
    timerRef.current = activeTimer
  }, [activeTimer])

  useEffect(() => {
    if (!activeTimer || !activeTimer.isActive || !activeTimer.startTime) {
      setDuration('00:00')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const updateDuration = () => {
      // Use ref to get latest timer value (handles closure issue)
      const timer = timerRef.current
      if (!timer || !timer.isActive || !timer.startTime) {
        return
      }

      const start = new Date(timer.startTime)
      const now = new Date()
      
      // Calculate total elapsed time
      let elapsedMs = now.getTime() - start.getTime()
      
      // Subtract paused duration (accumulated paused time)
      const pausedMs = (timer.pausedDuration || 0) * 60000
      elapsedMs -= pausedMs
      
      // If currently paused, subtract current pause time
      if (timer.isPaused && timer.lastPausedAt) {
        const currentPauseMs = now.getTime() - new Date(timer.lastPausedAt).getTime()
        elapsedMs -= currentPauseMs
      }
      
      // Calculate seconds
      const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      // Format duration
      if (hours > 0) {
        setDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      } else {
        setDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }
    }

    // Immediate calculation on timer change
    updateDuration()
    intervalRef.current = setInterval(updateDuration, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [activeTimer])

  return duration
}

export type AnalyticsData = {
  totalHours: number
  totalEntries: number
  byUser: Array<{
    userId: string
    userName: string
    userEmail: string
    hours: number
    entries: number
  }>
  byProject: Array<{
    project: string
    hours: number
    contributors: number
  }>
  byDay: Array<{
    date: string
    hours: number
    entries: number
  }>
}

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchAnalytics = useCallback(async (startDate?: string, endDate?: string, userId?: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: AnalyticsData }>(
        GET_ANALYTICS(startDate, endDate, userId),
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      setError(normalizeError(err))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchAnalytics }
}
