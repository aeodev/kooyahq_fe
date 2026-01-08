import { useCallback } from 'react'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { MAX_COMPARE_PROJECTS } from '@/constants/cost-analytics.constants'
import type { ViewMode } from '@/types/cost-analytics'

interface UseCostAnalyticsActionsOptions {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  startDate: string
  endDate: string
}

/**
 * Hook to manage cost analytics actions
 * Consolidates all action handlers for the cost analytics page
 */
export function useCostAnalyticsActions({
  viewMode,
  setViewMode,
  startDate,
  endDate,
}: UseCostAnalyticsActionsOptions) {
  const {
    setSelectedProject,
    setCompareProjects,
    compareProjects,
    fetchLiveData,
    fetchSummaryData,
    fetchProjectList,
    fetchProjectDetail,
    fetchCompareData,
    selectedProject,
  } = useCostAnalyticsStore()

  const handleSelectProject = useCallback(
    (project: string) => {
      setSelectedProject(project)
      setViewMode('single')
    },
    [setSelectedProject, setViewMode]
  )

  const handleClearProject = useCallback(() => {
    setSelectedProject(null)
    setViewMode('all')
  }, [setSelectedProject, setViewMode])

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

  const handleRefresh = useCallback(() => {
    fetchLiveData()
    if (startDate && endDate) {
      fetchSummaryData(startDate, endDate)
    }
    fetchProjectList()
    
    if (selectedProject && viewMode === 'single') {
      fetchProjectDetail(selectedProject, startDate, endDate)
    }
    
    if (viewMode === 'compare' && compareProjects.length > 0) {
      fetchCompareData(compareProjects, startDate, endDate)
    }
  }, [
    fetchLiveData,
    fetchSummaryData,
    fetchProjectList,
    fetchProjectDetail,
    fetchCompareData,
    startDate,
    endDate,
    selectedProject,
    viewMode,
    compareProjects,
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
