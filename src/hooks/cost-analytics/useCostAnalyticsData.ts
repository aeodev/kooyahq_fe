import { useEffect } from 'react'
import { useDebounce } from '@/composables/useDebounce'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { isValidDateRange } from '@/utils/date'

interface UseCostAnalyticsDataOptions {
  startDate: string
  endDate: string
  viewMode: 'all' | 'single' | 'compare'
  selectedProject: string | null
  compareProjects: string[]
}

/**
 * Hook to manage cost analytics data fetching
 * Handles date range changes with debouncing and coordinates all data fetching
 */
export function useCostAnalyticsData({
  startDate,
  endDate,
  viewMode,
  selectedProject,
  compareProjects,
}: UseCostAnalyticsDataOptions) {
  const {
    fetchLiveData,
    fetchSummaryData,
    fetchProjectList,
    fetchProjectDetail,
    fetchCompareData,
  } = useCostAnalyticsStore()

  // Debounce date changes to avoid excessive API calls
  const debouncedStartDate = useDebounce(startDate, 500)
  const debouncedEndDate = useDebounce(endDate, 500)

  // Fetch project list on mount
  useEffect(() => {
    fetchProjectList()
  }, [fetchProjectList])

  // Fetch summary data when dates change (debounced)
  useEffect(() => {
    if (debouncedStartDate && debouncedEndDate && isValidDateRange(debouncedStartDate, debouncedEndDate)) {
      fetchSummaryData(debouncedStartDate, debouncedEndDate)
    }
  }, [debouncedStartDate, debouncedEndDate, fetchSummaryData])

  // Fetch project detail when in single view mode
  useEffect(() => {
    if (selectedProject && viewMode === 'single' && debouncedStartDate && debouncedEndDate) {
      if (isValidDateRange(debouncedStartDate, debouncedEndDate)) {
        fetchProjectDetail(selectedProject, debouncedStartDate, debouncedEndDate)
      }
    }
  }, [selectedProject, debouncedStartDate, debouncedEndDate, viewMode, fetchProjectDetail])

  // Fetch compare data when in compare mode
  useEffect(() => {
    if (viewMode === 'compare' && compareProjects.length > 0 && debouncedStartDate && debouncedEndDate) {
      if (isValidDateRange(debouncedStartDate, debouncedEndDate)) {
        fetchCompareData(compareProjects, debouncedStartDate, debouncedEndDate)
      }
    }
  }, [compareProjects, debouncedStartDate, debouncedEndDate, viewMode, fetchCompareData])

  return {
    fetchLiveData,
    fetchSummaryData,
    fetchProjectList,
    fetchProjectDetail,
    fetchCompareData,
  }
}
