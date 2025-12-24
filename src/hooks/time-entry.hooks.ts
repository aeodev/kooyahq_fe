import { useCallback, useState, useEffect, useRef } from 'react'
import axiosInstance from '@/utils/axios.instance'
import { GET_ANALYTICS } from '@/utils/api.routes'
import { normalizeError, type Errors } from '@/utils/error'
import type { TimeEntry } from '@/types/time-entry'

// Hook for real-time timer updates - returns both formatted duration and elapsed minutes
export const useTimerDuration = (activeTimer: TimeEntry | null) => {
  const [duration, setDuration] = useState<string>('00:00')
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<TimeEntry | null>(activeTimer)

  useEffect(() => {
    timerRef.current = activeTimer
  }, [activeTimer])

  useEffect(() => {
    if (!activeTimer || !activeTimer.isActive || !activeTimer.startTime) {
      setDuration('00:00')
      setElapsedMinutes(0)
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

      // Update elapsed minutes (same calculation as display, single source of truth)
      setElapsedMinutes(totalSeconds / 60)

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

  return { duration, elapsedMinutes }
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
