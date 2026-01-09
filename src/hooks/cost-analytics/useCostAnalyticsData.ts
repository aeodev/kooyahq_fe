import { useEffect } from 'react'
import { useDebounce } from '@/composables/useDebounce'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { isValidDateRange } from '@/utils/date'
import {
  fetchLiveData as fetchLiveDataService,
  fetchSummaryData as fetchSummaryDataService,
  fetchProjectList as fetchProjectListService,
  fetchProjectDetail as fetchProjectDetailService,
  fetchCompareData as fetchCompareDataService,
} from '@/services/cost-analytics.service'

interface UseCostAnalyticsDataOptions {
  startDate: string
  endDate: string
  viewMode: 'all' | 'single' | 'compare'
  selectedProject: string | null
  compareProjects: string[]
}

/**
 * Hook to manage cost analytics data fetching
 * Uses service layer for API calls and updates store state
 */
export function useCostAnalyticsData({
  startDate,
  endDate,
  viewMode,
  selectedProject,
  compareProjects,
}: UseCostAnalyticsDataOptions) {
  const {
    setLiveData,
    setLiveLoading,
    setLiveError,
    setSummaryData,
    setSummaryLoading,
    setSummaryError,
    setProjectList,
    setProjectListLoading,
    setProjectDetail,
    setProjectDetailLoading,
    setProjectDetailError,
    setCompareData,
    setCompareLoading,
    markAsLoaded,
  } = useCostAnalyticsStore()

  // Debounce date changes to avoid excessive API calls
  const debouncedStartDate = useDebounce(startDate, 500)
  const debouncedEndDate = useDebounce(endDate, 500)

  // Fetch project list on mount (only once)
  useEffect(() => {
    let cancelled = false
    setProjectListLoading(true)
    fetchProjectListService()
      .then((projects) => {
        if (!cancelled) {
          setProjectList(projects || [])
          setProjectListLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Cost Analytics] Failed to fetch project list:', err)
          // Set empty array on error so UI shows "No projects available" instead of loading forever
          setProjectList([])
          setProjectListLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [setProjectList, setProjectListLoading])

  // Fetch summary data when dates change (debounced)
  useEffect(() => {
    if (!debouncedStartDate || !debouncedEndDate || !isValidDateRange(debouncedStartDate, debouncedEndDate)) {
      return
    }

    let cancelled = false
    setSummaryLoading(true)
    setSummaryError(null)
    fetchSummaryDataService(debouncedStartDate, debouncedEndDate)
      .then((data) => {
        if (!cancelled) {
          setSummaryData(data)
          setSummaryLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSummaryError(err.message || 'Failed to fetch cost summary')
          setSummaryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedStartDate, debouncedEndDate, setSummaryData, setSummaryLoading, setSummaryError])

  // Fetch project detail when in single view mode
  useEffect(() => {
    if (!selectedProject || viewMode !== 'single' || !debouncedStartDate || !debouncedEndDate) {
      return
    }

    if (!isValidDateRange(debouncedStartDate, debouncedEndDate)) {
      return
    }

    let cancelled = false
    setProjectDetailLoading(true)
    setProjectDetailError(null)
    fetchProjectDetailService(selectedProject, debouncedStartDate, debouncedEndDate)
      .then((data) => {
        if (!cancelled) {
          setProjectDetail(data)
          setProjectDetailLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProjectDetailError(err.message || 'Failed to fetch project detail')
          setProjectDetailLoading(false)
          setProjectDetail(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    selectedProject,
    debouncedStartDate,
    debouncedEndDate,
    viewMode,
    setProjectDetail,
    setProjectDetailLoading,
    setProjectDetailError,
  ])

  // Fetch compare data when in compare mode
  useEffect(() => {
    if (viewMode !== 'compare' || compareProjects.length === 0 || !debouncedStartDate || !debouncedEndDate) {
      return
    }

    if (!isValidDateRange(debouncedStartDate, debouncedEndDate)) {
      return
    }

    let cancelled = false
    setCompareLoading(true)
    fetchCompareDataService(compareProjects, debouncedStartDate, debouncedEndDate)
      .then((data) => {
        if (!cancelled) {
          setCompareData(data)
          setCompareLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[Cost Analytics] Failed to fetch compare data:', err)
          setCompareLoading(false)
          // Partial results may still be useful, so we don't clear compareData
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    compareProjects,
    debouncedStartDate,
    debouncedEndDate,
    viewMode,
    setCompareData,
    setCompareLoading,
  ])

  // Wrapper functions for external use (e.g., polling, refresh)
  const fetchLiveData = async () => {
    setLiveLoading(true)
    setLiveError(null)
    try {
      const data = await fetchLiveDataService()
      setLiveData(data)
      setLiveLoading(false)
      markAsLoaded()
    } catch (err: unknown) {
      const error = err as { message?: string }
      setLiveError(error.message || 'Failed to fetch live cost data')
      setLiveLoading(false)
    }
  }

  const fetchSummaryData = async (start: string, end: string) => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await fetchSummaryDataService(start, end)
      setSummaryData(data)
      setSummaryLoading(false)
    } catch (err: unknown) {
      const error = err as { message?: string }
      setSummaryError(error.message || 'Failed to fetch cost summary')
      setSummaryLoading(false)
    }
  }

  const fetchProjectList = async () => {
    setProjectListLoading(true)
    try {
      const projects = await fetchProjectListService()
      setProjectList(projects || [])
      setProjectListLoading(false)
    } catch (err) {
      console.error('[Cost Analytics] Failed to fetch project list:', err)
      // Set empty array on error so UI shows "No projects available" instead of loading forever
      setProjectList([])
      setProjectListLoading(false)
    }
  }

  const fetchProjectDetail = async (projectName: string, start: string, end: string) => {
    setProjectDetailLoading(true)
    setProjectDetailError(null)
    try {
      const data = await fetchProjectDetailService(projectName, start, end)
      setProjectDetail(data)
      setProjectDetailLoading(false)
    } catch (err: unknown) {
      const error = err as { message?: string }
      setProjectDetailError(error.message || 'Failed to fetch project detail')
      setProjectDetailLoading(false)
      setProjectDetail(null)
    }
  }

  const fetchCompareData = async (projects: string[], start: string, end: string) => {
    setCompareLoading(true)
    try {
      const data = await fetchCompareDataService(projects, start, end)
      setCompareData(data)
      setCompareLoading(false)
    } catch (err) {
      console.error('[Cost Analytics] Failed to fetch compare data:', err)
      setCompareLoading(false)
    }
  }

  return {
    fetchLiveData,
    fetchSummaryData,
    fetchProjectList,
    fetchProjectDetail,
    fetchCompareData,
  }
}
