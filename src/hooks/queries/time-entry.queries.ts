import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_MY_TIME_ENTRIES, GET_ACTIVE_TIMER, GET_TIME_ENTRIES, GET_ANALYTICS } from '@/utils/api.routes'
import type { TimeEntry } from '@/types/time-entry'

export const timeEntryKeys = {
  all: ['timeEntries'] as const,
  myEntries: () => [...timeEntryKeys.all, 'my'] as const,
  allEntries: () => [...timeEntryKeys.all, 'all'] as const,
  activeTimer: () => [...timeEntryKeys.all, 'activeTimer'] as const,
  analytics: (startDate?: string, endDate?: string, userId?: string) => 
    [...timeEntryKeys.all, 'analytics', { startDate, endDate, userId }] as const,
}

export function useMyEntriesQuery() {
  return useQuery({
    queryKey: timeEntryKeys.myEntries(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(GET_MY_TIME_ENTRIES())
      return response.data.data
    },
  })
}

export function useAllEntriesQuery(enabled = true) {
  return useQuery({
    queryKey: timeEntryKeys.allEntries(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry[] }>(GET_TIME_ENTRIES())
      return response.data.data
    },
    enabled,
  })
}

export function useActiveTimerQuery() {
  return useQuery({
    queryKey: timeEntryKeys.activeTimer(),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: TimeEntry | null }>(GET_ACTIVE_TIMER())
      return response.data.data
    },
    // Active timer needs fresh data
    staleTime: 0,
  })
}

type AnalyticsData = {
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

export function useAnalyticsQuery(startDate?: string, endDate?: string, userId?: string, enabled = true) {
  return useQuery({
    queryKey: timeEntryKeys.analytics(startDate, endDate, userId),
    queryFn: async () => {
      const response = await axiosInstance.get<{ status: string; data: AnalyticsData }>(
        GET_ANALYTICS(startDate, endDate, userId)
      )
      return response.data.data
    },
    enabled,
  })
}

export function useTimeEntryQueryActions() {
  const queryClient = useQueryClient()

  const invalidateMyEntries = () => {
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.myEntries() })
  }

  const invalidateAllEntries = () => {
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.allEntries() })
  }

  const invalidateActiveTimer = () => {
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.activeTimer() })
  }

  const setActiveTimer = (timer: TimeEntry | null) => {
    queryClient.setQueryData(timeEntryKeys.activeTimer(), timer)
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: timeEntryKeys.all })
  }

  return {
    invalidateMyEntries,
    invalidateAllEntries,
    invalidateActiveTimer,
    setActiveTimer,
    invalidateAll,
  }
}


