import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
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
import { convertFromPHP } from '@/utils/currency-converter'
import { CostAnalyticsHeader } from './components/CostAnalyticsHeader'
import { ProjectSummaryView } from './components/projects/ProjectSummaryView'
import { DeveloperSummaryView } from './components/developers/DeveloperSummaryView'
import { ErrorState } from './components/EmptyStates'
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

  // Active tab state
  const [activeTab, setActiveTab] = useState<'projects' | 'developers'>('projects')

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

  const isLoading = liveLoading || summaryLoading

  // Track if we've loaded data at least once
  const hasLoadedOnce = liveData !== null

  const { lastUpdated } = useCostAnalyticsStore()

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
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={lastUpdated}
      />

      {/* Error Display */}
      {(liveError || summaryError) && (
        <ErrorState
          message={liveError || summaryError || 'Failed to load cost data'}
          onRetry={handleRefresh}
        />
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'projects' | 'developers')}>
        <TabsContent value="projects" className="mt-0">
          <ProjectSummaryView
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onQuickRange={quickRange}
            viewMode={viewMode}
            selectedDevelopers={selectedDevelopers}
            setSelectedDevelopers={setSelectedDevelopers}
            currencyConfig={currencyConfig}
            hasLoadedOnce={hasLoadedOnce}
            onSelectProject={handleSelectProject}
            onClearProject={handleClearProject}
            onToggleCompareProject={handleToggleCompareProject}
            onEnterCompareMode={handleEnterCompareMode}
            onExitCompareMode={handleExitCompareMode}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="developers" className="mt-0">
          <DeveloperSummaryView
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onQuickRange={quickRange}
            currencyConfig={currencyConfig}
            hasLoadedOnce={hasLoadedOnce}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
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
