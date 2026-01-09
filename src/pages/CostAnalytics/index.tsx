import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { useSocketStore } from '@/stores/socket.store'
import { registerCostAnalyticsHandlers, unregisterCostAnalyticsHandlers } from '@/hooks/cost-analytics.hooks'
import { usePolling } from '@/composables/usePolling'
import { useCostAnalyticsData } from '@/hooks/cost-analytics/useCostAnalyticsData'
import { useCostAnalyticsActions } from '@/hooks/cost-analytics/useCostAnalyticsActions'
import { getDateRange } from '@/utils/date'
import { LIVE_DATA_POLL_INTERVAL } from '@/constants/cost-analytics.constants'
import { CURRENCIES } from '@/types/cost-analytics'
import type { ViewMode } from '@/types/cost-analytics'
import { filterSummaryDataByDevelopers } from '@/utils/cost-analytics.utils'
import { convertFromPHP } from '@/utils/currency-converter'
import { CostAnalyticsHeader } from './components/CostAnalyticsHeader'
import { ProjectFilter } from './components/ProjectFilter'
import { LiveCostTracking } from './components/LiveCostTracking'
import { HistoricalAnalysis } from './components/HistoricalAnalysis'
import { CostCharts } from './components/CostCharts'
import { ProjectDetailView } from './components/ProjectDetailView'
import { ProjectComparisonView } from './components/ProjectComparisonView'
import { TopPerformers } from './components/TopPerformers'
import { DeveloperFilter } from './components/DeveloperFilter'
import { ErrorState, NoDataState } from './components/EmptyStates'
import { CostAnalyticsErrorBoundary } from '@/components/cost-analytics/CostAnalyticsErrorBoundary'

function CostAnalyticsContent() {
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
    currency,
    fetchLiveData,
    setCurrency,
  } = useCostAnalyticsStore()

  const currencyConfig = CURRENCIES[currency]

  // Socket for real-time updates
  const socket = useSocketStore((state) => state.socket)
  const socketConnected = useSocketStore((state) => state.connected)
  const eventHandlersRef = useMemo(() => new Map<string, (...args: unknown[]) => void>(), [])

  const [startDate, setStartDate] = useState(() => {
    const { start } = getDateRange(30)
    return start
  })
  const [endDate, setEndDate] = useState(() => {
    const { end } = getDateRange(0)
    return end
  })

  // View mode: 'all' | 'single' | 'compare'
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  // Developer filter state
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])

  // Use polling composable for live data (respects visibility)
  usePolling({
    callback: fetchLiveData,
    interval: LIVE_DATA_POLL_INTERVAL,
    enabled: true,
    pauseOnHidden: true,
  })

  // Use data fetching hook
  useCostAnalyticsData({
    startDate,
    endDate,
    viewMode,
    selectedProject,
    compareProjects,
  })

  // Use actions hook
  const {
    handleSelectProject,
    handleClearProject,
    handleToggleCompareProject,
    handleEnterCompareMode,
    handleExitCompareMode,
    handleRefresh,
  } = useCostAnalyticsActions({
    viewMode,
    setViewMode,
    startDate,
    endDate,
  })

  // Pre-fetch exchange rates when currency changes
  useEffect(() => {
    // Pre-fetch rates by doing a conversion (this will cache the rates)
    // Only fetch if not PHP (no conversion needed for PHP)
    if (currency !== 'PHP') {
      convertFromPHP(1, currency).catch((error) => {
        console.warn('[Cost Analytics] Failed to pre-fetch exchange rates:', error)
      })
    }
  }, [currency])

  // Socket integration for real-time updates
  useEffect(() => {
    if (socket && socketConnected) {
      registerCostAnalyticsHandlers(socket, eventHandlersRef)
    }

    return () => {
      if (socket) {
        unregisterCostAnalyticsHandlers(socket, eventHandlersRef)
      }
    }
  }, [socket, socketConnected, eventHandlersRef])

  const quickRange = (days: number) => {
    const range = getDateRange(days)
    setStartDate(range.start)
    setEndDate(range.end)
  }

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

  const isLoading = liveLoading || summaryLoading

  // Track if we've loaded data at least once
  const hasLoadedOnce = liveData !== null

  return (
    <section className="space-y-6">
      {/* Header */}
      <CostAnalyticsHeader
        currency={currency}
        onCurrencyChange={setCurrency}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        viewMode={viewMode}
        summaryData={summaryData}
        projectDetail={projectDetail}
        compareData={compareData}
        liveData={liveData}
        selectedProject={selectedProject}
      />

      {/* Error Display */}
      {(liveError || summaryError) && (
        <ErrorState
          message={liveError || summaryError || 'Failed to load cost data'}
          onRetry={handleRefresh}
        />
      )}

      {/* Project Filter & Compare Mode */}
      <ProjectFilter
        projectList={projectList}
        projectListLoading={projectListLoading}
        selectedProject={selectedProject}
        viewMode={viewMode}
        compareProjects={compareProjects}
        onSelectProject={handleSelectProject}
        onClearProject={handleClearProject}
        onEnterCompareMode={handleEnterCompareMode}
        onExitCompareMode={handleExitCompareMode}
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
            onToggleCompareProject={handleToggleCompareProject}
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
            <Button variant="ghost" size="sm" onClick={handleClearProject} className="h-6 px-2">
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
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onQuickRange={quickRange}
      />

      {/* Charts */}
      <CostCharts
        summaryData={filteredSummaryData}
        summaryLoading={summaryLoading}
        currencyConfig={currencyConfig}
      />

      {/* Top Performers */}
      {filteredSummaryData?.topPerformers && filteredSummaryData.topPerformers.length > 0 && (
        <TopPerformers
          topPerformers={filteredSummaryData.topPerformers}
          isLoading={summaryLoading}
          currencyConfig={currencyConfig}
        />
      )}

      {/* No Data State */}
      {!summaryLoading && summaryData && summaryData.totalCost === 0 && (
        <NoDataState
          message="No cost data available for this period"
          suggestion="Try selecting a different date range"
        />
      )}
    </section>
  )
}

export function CostAnalytics() {
  return (
    <CostAnalyticsErrorBoundary>
      <CostAnalyticsContent />
    </CostAnalyticsErrorBoundary>
  )
}
