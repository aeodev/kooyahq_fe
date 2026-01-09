import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'
import type { CurrencyConfig } from '@/types/cost-analytics'
import {
  filterSummaryDataByDevelopers,
  filterProjectDetailByDevelopers,
  filterCompareDataByDevelopers,
} from '@/utils/cost-analytics.utils'
import { ProjectFilter } from './ProjectFilter'
import { LiveCostTracking } from '../shared/LiveCostTracking'
import { HistoricalAnalysis } from '../shared/HistoricalAnalysis'
import { CostCharts } from '../CostCharts'
import { ProjectDetailView } from './ProjectDetailView'
import { ProjectComparisonView } from './ProjectComparisonView'
import { DeveloperFilter } from '../developers/DeveloperFilter'
import { NoDataState } from '../EmptyStates'
import { BudgetTracking } from '../shared/BudgetTracking'

interface ProjectSummaryViewProps {
  currencyConfig: CurrencyConfig
  hasLoadedOnce: boolean
  onSelectProject: (project: string) => void
  onClearProject: () => void
  onToggleCompareProject: (project: string) => void
  onEnterCompareMode: () => void
  onExitCompareMode: () => void
  onRefresh: () => void
}

export function ProjectSummaryView({
  currencyConfig,
  hasLoadedOnce,
  onSelectProject,
  onClearProject,
  onToggleCompareProject,
  onEnterCompareMode,
  onExitCompareMode,
  onRefresh: _onRefresh,
}: ProjectSummaryViewProps) {
  const {
    liveData,
    liveLoading,
    summaryData,
    summaryLoading,
    projectList,
    projectListLoading,
    selectedProject,
    projectDetail,
    projectDetailLoading,
    projectDetailError,
    compareProjects,
    compareData,
    compareLoading,
  } = useCostAnalyticsStore()

  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    quickRange,
    viewMode,
    selectedDevelopers,
    setSelectedDevelopers,
  } = useCostAnalyticsContext()

  // Alias for HistoricalAnalysis component compatibility
  const onStartDateChange = setStartDate
  const onEndDateChange = setEndDate
  const onQuickRange = quickRange

  // Filter data by selected developers using utility functions
  const filteredSummaryData = useMemo(() => {
    if (!summaryData || selectedDevelopers.length === 0) return summaryData
    return filterSummaryDataByDevelopers(summaryData, selectedDevelopers)
  }, [summaryData, selectedDevelopers])

  const filteredProjectDetail = useMemo(() => {
    return filterProjectDetailByDevelopers(projectDetail, selectedDevelopers)
  }, [projectDetail, selectedDevelopers])

  const filteredCompareData = useMemo(() => {
    return filterCompareDataByDevelopers(compareData, selectedDevelopers)
  }, [compareData, selectedDevelopers])

  // Use summaryData.projectCosts or liveData as fallback if projectList is empty
  const effectiveProjectList = useMemo(() => {
    if (projectList.length > 0) return projectList
    if (summaryData?.projectCosts?.length) {
      return summaryData.projectCosts.map((pc) => pc.project)
    }
    // Additional fallback: extract unique projects from liveData
    if (liveData?.projectCosts?.length) {
      const projects = liveData.projectCosts.map((pc) => pc.project).filter(Boolean) as string[]
      if (projects.length > 0) return projects
    }
    return []
  }, [projectList, summaryData, liveData])

  return (
    <div className="space-y-4">
      {/* Unified Filters Bar */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Project Filter */}
          <div className="flex-1 min-w-0">
            <ProjectFilter
              projectList={effectiveProjectList}
              projectListLoading={projectListLoading}
              selectedProject={selectedProject}
              viewMode={viewMode}
              compareProjects={compareProjects}
              onSelectProject={onSelectProject}
              onClearProject={onClearProject}
              onEnterCompareMode={onEnterCompareMode}
              onExitCompareMode={onExitCompareMode}
            />
          </div>

          {/* Developer Filter */}
          <div className="flex-1 min-w-0">
            <DeveloperFilter
              summaryData={summaryData}
              projectDetail={projectDetail}
              liveData={liveData}
              selectedDevelopers={selectedDevelopers}
              onDevelopersChange={setSelectedDevelopers}
            />
          </div>
        </div>
      </div>

      {/* Compare Mode Project Selection */}
      <AnimatePresence mode="wait">
        {viewMode === 'compare' && (
          <ProjectComparisonView
            key="compare-view"
            compareProjects={compareProjects}
            compareData={filteredCompareData}
            compareLoading={compareLoading}
            projectList={effectiveProjectList}
            currencyConfig={currencyConfig}
            onToggleCompareProject={onToggleCompareProject}
          />
        )}
      </AnimatePresence>

      {/* Selected Project Indicator */}
      <AnimatePresence>
        {viewMode === 'single' && selectedProject && (
          <motion.div
            key="project-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit"
          >
            <span className="text-sm font-medium text-primary">{selectedProject}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearProject} 
              className="h-5 w-5 p-0 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Project Detail View */}
      <AnimatePresence>
        {viewMode === 'single' && selectedProject && (
          <ProjectDetailView
            key={selectedProject}
            projectName={selectedProject}
            projectDetail={filteredProjectDetail}
            projectDetailLoading={projectDetailLoading}
            projectDetailError={projectDetailError}
            currencyConfig={currencyConfig}
          />
        )}
      </AnimatePresence>

      {/* Live Stats Section */}
      <LiveCostTracking
        liveData={liveData}
        currencyConfig={currencyConfig}
        isLoading={liveLoading && !hasLoadedOnce}
        summaryData={filteredSummaryData}
      />

      {/* Historical Analysis */}
      <HistoricalAnalysis
        startDate={startDate}
        endDate={endDate}
        summaryData={filteredSummaryData}
        summaryLoading={summaryLoading}
        currencyConfig={currencyConfig}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onQuickRange={onQuickRange}
      />

      {/* Budget Tracking */}
      <BudgetTracking
        currencyConfig={currencyConfig}
        projectList={effectiveProjectList}
        selectedProject={selectedProject}
      />

      {/* Charts */}
      <CostCharts
        summaryData={filteredSummaryData}
        summaryLoading={summaryLoading}
        currencyConfig={currencyConfig}
      />

      {/* No Data State */}
      {!summaryLoading && summaryData && summaryData.totalCost === 0 && (
        <NoDataState
          message="No cost data available for this period"
          suggestion="Try selecting a different date range"
        />
      )}
    </div>
  )
}
