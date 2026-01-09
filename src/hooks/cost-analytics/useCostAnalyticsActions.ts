import { useCallback } from 'react'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'
import { MAX_COMPARE_PROJECTS } from '@/constants/cost-analytics.constants'
import {
  fetchLiveData as fetchLiveDataService,
  fetchSummaryData as fetchSummaryDataService,
  fetchProjectList as fetchProjectListService,
  fetchProjectDetail as fetchProjectDetailService,
  fetchCompareData as fetchCompareDataService,
} from '@/services/cost-analytics.service'

/**
 * Hook to manage cost analytics actions
 * Uses context for UI state and service layer for API calls
 */
export function useCostAnalyticsActions() {
  const {
    setSelectedProject,
    setCompareProjects,
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

  const {
    viewMode,
    setViewMode,
    startDate,
    endDate,
    compareProjects,
    selectedProject,
  } = useCostAnalyticsContext()

  const handleSelectProject = useCallback(
    (project: string) => {
      setSelectedProject(project)
      setViewMode('single')
    },
    [setSelectedProject, setViewMode]
  )

  const handleClearProject = useCallback(async () => {
    setSelectedProject(null)
    setViewMode('all')
    // Refresh summary data to ensure all projects are shown
    if (startDate && endDate) {
      setSummaryLoading(true)
      setSummaryError(null)
      try {
        const summaryData = await fetchSummaryDataService(startDate, endDate)
        setSummaryData(summaryData)
        setSummaryLoading(false)
      } catch (err: unknown) {
        const error = err as { message?: string }
        setSummaryError(error.message || 'Failed to fetch cost summary')
        setSummaryLoading(false)
      }
    }
  }, [setSelectedProject, setViewMode, startDate, endDate, setSummaryData, setSummaryLoading, setSummaryError])

  const handleToggleCompareProject = useCallback(
    (project: string) => {
      const newProjects = compareProjects.includes(project)
        ? compareProjects.filter((p) => p !== project)
        : [...compareProjects, project].slice(0, MAX_COMPARE_PROJECTS)
      setCompareProjects(newProjects)
    },
    [compareProjects, setCompareProjects]
  )

  const handleEnterCompareMode = useCallback(() => {
    setViewMode('compare')
    setSelectedProject(null)
  }, [setViewMode, setSelectedProject])

  const handleExitCompareMode = useCallback(() => {
    setViewMode('all')
    setCompareProjects([])
  }, [setViewMode, setCompareProjects])

  const handleRefresh = useCallback(async () => {
    // Refresh live data
    setLiveLoading(true)
    setLiveError(null)
    try {
      const liveData = await fetchLiveDataService()
      setLiveData(liveData)
      setLiveLoading(false)
      markAsLoaded()
    } catch (err: unknown) {
      const error = err as { message?: string }
      setLiveError(error.message || 'Failed to fetch live cost data')
      setLiveLoading(false)
    }

    // Refresh summary data
    if (startDate && endDate) {
      setSummaryLoading(true)
      setSummaryError(null)
      try {
        const summaryData = await fetchSummaryDataService(startDate, endDate)
        setSummaryData(summaryData)
        setSummaryLoading(false)
      } catch (err: unknown) {
        const error = err as { message?: string }
        setSummaryError(error.message || 'Failed to fetch cost summary')
        setSummaryLoading(false)
      }
    }

    // Refresh project list
    setProjectListLoading(true)
    try {
      const projects = await fetchProjectListService()
      setProjectList(projects)
      setProjectListLoading(false)
    } catch (err) {
      console.error('[Cost Analytics] Failed to fetch project list:', err)
      setProjectListLoading(false)
    }

    // Refresh project detail if in single mode
    if (selectedProject && viewMode === 'single' && startDate && endDate) {
      setProjectDetailLoading(true)
      setProjectDetailError(null)
      try {
        const detail = await fetchProjectDetailService(selectedProject, startDate, endDate)
        setProjectDetail(detail)
        setProjectDetailLoading(false)
      } catch (err: unknown) {
        const error = err as { message?: string }
        setProjectDetailError(error.message || 'Failed to fetch project detail')
        setProjectDetailLoading(false)
        setProjectDetail(null)
      }
    }

    // Refresh compare data if in compare mode
    if (viewMode === 'compare' && compareProjects.length > 0 && startDate && endDate) {
      setCompareLoading(true)
      try {
        const compareData = await fetchCompareDataService(compareProjects, startDate, endDate)
        setCompareData(compareData)
        setCompareLoading(false)
      } catch (err) {
        console.error('[Cost Analytics] Failed to fetch compare data:', err)
        setCompareLoading(false)
      }
    }
  }, [
    startDate,
    endDate,
    selectedProject,
    viewMode,
    compareProjects,
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
  ])

  return {
    handleSelectProject,
    handleClearProject,
    handleToggleCompareProject,
    handleEnterCompareMode,
    handleExitCompareMode,
    handleRefresh,
  }
}
