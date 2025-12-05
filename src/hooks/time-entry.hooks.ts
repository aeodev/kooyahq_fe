import { useCallback, useState, useEffect, useRef } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_TIME_ENTRIES, GET_ANALYTICS } from '@/utils/api.routes'
import type { TimeEntry } from '@/types/time-entry'

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

  return { data, loading, error, fetchEntries }
}

// Hook for real-time timer updates
export const useTimerDuration = (activeTimer: TimeEntry | null) => {
  const [duration, setDuration] = useState<string>('00:00')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<TimeEntry | null>(activeTimer)

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
      const timer = timerRef.current
      if (!timer || !timer.isActive || !timer.startTime) {
        return
      }

      const start = new Date(timer.startTime)
      const now = new Date()

      let elapsedMs = now.getTime() - start.getTime()
      const pausedMs = timer.pausedDuration || 0
      elapsedMs -= pausedMs

      if (timer.isPaused && timer.lastPausedAt) {
        const currentPauseMs = now.getTime() - new Date(timer.lastPausedAt).getTime()
        elapsedMs -= currentPauseMs
      }

      const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (hours > 0) {
        setDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      } else {
        setDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }
    }

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
  totalOvertimeEntries: number
  byUser: Array<{
    userId: string
    userName: string
    userEmail: string
    hours: number
    entries: number
    overtimeEntries: number
    overtimeHours: number
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
