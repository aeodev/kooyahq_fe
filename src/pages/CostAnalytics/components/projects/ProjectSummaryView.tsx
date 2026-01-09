import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { ViewMode, CurrencyConfig } from '@/types/cost-analytics'
import { filterSummaryDataByDevelopers } from '@/utils/cost-analytics.utils'
import { ProjectFilter } from './ProjectFilter'
import { LiveCostTracking } from '../shared/LiveCostTracking'
import { HistoricalAnalysis } from '../shared/HistoricalAnalysis'
import { CostCharts } from '../CostCharts'
import { ProjectDetailView } from './ProjectDetailView'
import { ProjectComparisonView } from './ProjectComparisonView'
import { DeveloperFilter } from '../developers/DeveloperFilter'
import { ErrorState, NoDataState } from '../EmptyStates'

interface ProjectSummaryViewProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onQuickRange: (days: number) => void
  viewMode: ViewMode
  selectedDevelopers: string[]
  setSelectedDevelopers: (developers: string[]) => void
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
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickRange,
  viewMode,
  selectedDevelopers,
  setSelectedDevelopers,
  currencyConfig,
  hasLoadedOnce,
  onSelectProject,
  onClearProject,
  onToggleCompareProject,
  onEnterCompareMode,
  onExitCompareMode,
  onRefresh,
}: ProjectSummaryViewProps) {
  const {
    liveData,
    liveLoading,
    liveError,
    summaryData,
    summaryLoading,
    summaryError,
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

  // Filter data by selected developers
  const filteredSummaryData = useMemo(() => {
    if (!summaryData || selectedDevelopers.length === 0) return summaryData
    return filterSummaryDataByDevelopers(summaryData, selectedDevelopers)
  }, [summaryData, selectedDevelopers])

  const filteredProjectDetail = useMemo(() => {
    if (!projectDetail || selectedDevelopers.length === 0) return projectDetail
    const filteredDevelopers = projectDetail.developers.filter((dev) =>
      selectedDevelopers.includes(dev.userId)
    )
    if (filteredDevelopers.length === 0) return null
    const filteredHours = filteredDevelopers.reduce((sum, dev) => sum + dev.hours, 0)
    const filteredCost = filteredDevelopers.reduce((sum, dev) => sum + dev.cost, 0)
    return {
      ...projectDetail,
      developers: filteredDevelopers,
      totalHours: filteredHours,
      totalCost: filteredCost,
      avgHourlyRate: filteredHours > 0 ? filteredCost / filteredHours : projectDetail.avgHourlyRate,
    }
  }, [projectDetail, selectedDevelopers])

  const filteredCompareData = useMemo(() => {
    if (!compareData || selectedDevelopers.length === 0) return compareData
    return compareData
      .map((project) => {
        const filteredDevelopers = project.developers.filter((dev) =>
          selectedDevelopers.includes(dev.userId)
        )
        if (filteredDevelopers.length === 0) return null
        const filteredHours = filteredDevelopers.reduce((sum, dev) => sum + dev.hours, 0)
        const filteredCost = filteredDevelopers.reduce((sum, dev) => sum + dev.cost, 0)
        return {
          ...project,
          developers: filteredDevelopers,
          totalHours: filteredHours,
          totalCost: filteredCost,
          avgHourlyRate: filteredHours > 0 ? filteredCost / filteredHours : project.avgHourlyRate,
        }
      })
      .filter((p): p is typeof compareData[0] => p !== null)
  }, [compareData, selectedDevelopers])

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(liveError || summaryError) && (
        <ErrorState
          message={liveError || summaryError || 'Failed to load cost data'}
          onRetry={onRefresh}
        />
      )}

      {/* Project Filter & Compare Mode */}
      <ProjectFilter
        projectList={projectList}
        projectListLoading={projectListLoading}
        selectedProject={selectedProject}
        viewMode={viewMode}
        compareProjects={compareProjects}
        onSelectProject={onSelectProject}
        onClearProject={onClearProject}
        onEnterCompareMode={onEnterCompareMode}
        onExitCompareMode={onExitCompareMode}
      />

      {/* Developer Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <DeveloperFilter
          summaryData={summaryData}
          projectDetail={projectDetail}
          liveData={liveData}
          selectedDevelopers={selectedDevelopers}
          onDevelopersChange={setSelectedDevelopers}
        />
      </div>

      {/* Compare Mode Project Selection */}
      <AnimatePresence mode="wait">
        {viewMode === 'compare' && (
          <ProjectComparisonView
            key="compare-view"
            compareProjects={compareProjects}
            compareData={filteredCompareData}
            compareLoading={compareLoading}
            projectList={projectList}
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
            className="flex items-center gap-2"
          >
            <Badge variant="secondary">Viewing: {selectedProject}</Badge>
            <Button variant="ghost" size="sm" onClick={onClearProject} className="h-6 px-2">
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
      <LiveCostTracking liveData={liveData} currencyConfig={currencyConfig} isLoading={liveLoading && !hasLoadedOnce} />

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
