import { useEffect, useRef } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { useSocketStore } from '@/stores/socket.store'
import { registerCostAnalyticsHandlers, unregisterCostAnalyticsHandlers } from '@/hooks/cost-analytics.hooks'
import { usePolling } from '@/composables/usePolling'
import { useCostAnalyticsData } from '@/hooks/cost-analytics/useCostAnalyticsData'
import { useCostAnalyticsActions } from '@/hooks/cost-analytics/useCostAnalyticsActions'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'
import { LIVE_DATA_POLL_INTERVAL } from '@/constants/cost-analytics.constants'
import { CURRENCIES } from '@/types/cost-analytics'
import { convertFromPHP } from '@/utils/currency-converter'
import { CostAnalyticsHeader } from './components/CostAnalyticsHeader'
import { ProjectSummaryView } from './components/projects/ProjectSummaryView'
import { DeveloperSummaryView } from './components/developers/DeveloperSummaryView'
import { ErrorState } from './components/EmptyStates'
import { CostAnalyticsErrorBoundary } from '@/components/cost-analytics/CostAnalyticsErrorBoundary'
import { CostAnalyticsProvider } from '@/contexts/CostAnalyticsContext'

function CostAnalyticsContent() {
  const {
    liveData,
    liveLoading,
    liveError,
    summaryData,
    summaryLoading,
    summaryError,
    projectDetail,
    compareData,
    currency,
    setCurrency,
    lastUpdated,
    hasLoadedOnce,
  } = useCostAnalyticsStore()

  const {
    startDate,
    endDate,
    viewMode,
    compareProjects,
    selectedProject,
    activeTab,
    setActiveTab,
  } = useCostAnalyticsContext()

  const currencyConfig = CURRENCIES[currency]

  // Socket for real-time updates
  const socket = useSocketStore((state) => state.socket)
  const socketConnected = useSocketStore((state) => state.connected)
  const eventHandlersRef = useRef(new Map<string, (...args: unknown[]) => void>())

  // Get fetchLiveData from data hook for polling
  const { fetchLiveData: fetchLiveDataFromHook } = useCostAnalyticsData({
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
  } = useCostAnalyticsActions()

  // Use polling composable for live data (respects visibility)
  usePolling({
    callback: fetchLiveDataFromHook,
    interval: LIVE_DATA_POLL_INTERVAL,
    enabled: true,
    pauseOnHidden: true,
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
      registerCostAnalyticsHandlers(socket, eventHandlersRef.current)
    }

    return () => {
      if (socket) {
        unregisterCostAnalyticsHandlers(socket, eventHandlersRef.current)
      }
    }
  }, [socket, socketConnected])

  const isLoading = liveLoading || summaryLoading

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
      <CostAnalyticsProvider>
        <CostAnalyticsContent />
      </CostAnalyticsProvider>
    </CostAnalyticsErrorBoundary>
  )
}
