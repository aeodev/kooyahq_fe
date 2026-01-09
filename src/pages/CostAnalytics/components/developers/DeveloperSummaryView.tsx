import { useState, useMemo } from 'react'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import type { CurrencyConfig, TopPerformer } from '@/types/cost-analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistoricalAnalysis } from '../shared/HistoricalAnalysis'
import { DeveloperProfile } from './DeveloperProfile'
import { DeveloperFiltersComponent, type DeveloperFilters } from './shared/DeveloperFilters'
import { exportDevelopersToCSV } from '@/utils/developer-export.utils'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickStats } from './overview/QuickStats'
import { RecognitionSection } from './overview/RecognitionSection'
import { DeveloperTrends } from './overview/DeveloperTrends'
import { TeamBalance } from './TeamBalance'
import { ActivityPatterns } from './ActivityPatterns'
import { DeveloperContributions } from './DeveloperContributions'
import { ExpertiseMatrix } from './ExpertiseMatrix'
import { ProjectImpact } from './ProjectImpact'
import { DeveloperSearch } from './DeveloperSearch'
import { SkillsDiscovery } from './SkillsDiscovery'
import { NoDataState } from '../EmptyStates'

interface DeveloperSummaryViewProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onQuickRange: (days: number) => void
  currencyConfig: CurrencyConfig
  hasLoadedOnce: boolean
  onRefresh: () => void
}

export function DeveloperSummaryView({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickRange,
  currencyConfig,
  hasLoadedOnce,
  onRefresh,
}: DeveloperSummaryViewProps) {
  const {
    liveData,
    liveLoading,
    summaryData,
    summaryLoading,
  } = useCostAnalyticsStore()

  const [selectedDeveloper, setSelectedDeveloper] = useState<TopPerformer | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [filters, setFilters] = useState<DeveloperFilters>({
    search: '',
    project: null,
    minProjects: null,
    maxProjects: null,
  })

  const handleDeveloperClick = (developerId: string) => {
    const developer = summaryData?.topPerformers.find((p) => p.userId === developerId)
    if (developer) {
      setSelectedDeveloper(developer)
      setIsProfileOpen(true)
    }
  }

  const handleCloseProfile = () => {
    setIsProfileOpen(false)
    setTimeout(() => setSelectedDeveloper(null), 350)
  }

  const filteredPerformers = useMemo(() => {
    if (!summaryData) return []
    let filtered = summaryData.topPerformers

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.userName.toLowerCase().includes(query) ||
          p.position?.toLowerCase().includes(query) ||
          p.userEmail.toLowerCase().includes(query) ||
          p.projects.some((proj) => proj.toLowerCase().includes(query))
      )
    }

    if (filters.project) {
      filtered = filtered.filter((p) => p.projects.includes(filters.project!))
    }

    if (filters.minProjects !== null) {
      filtered = filtered.filter((p) => p.projectCount >= filters.minProjects!)
    }
    if (filters.maxProjects !== null) {
      filtered = filtered.filter((p) => p.projectCount <= filters.maxProjects!)
    }

    return filtered
  }, [summaryData, filters])

  if (!summaryData?.topPerformers || summaryData.topPerformers.length === 0) {
    if (!summaryLoading) {
      return (
        <div className="space-y-6">
          <NoDataState
            message="No developer data available for this period"
            suggestion="Try selecting a different date range"
          />
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <DeveloperProfile
        developer={selectedDeveloper}
        summaryData={summaryData}
        currencyConfig={currencyConfig}
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <DeveloperFiltersComponent
          topPerformers={summaryData.topPerformers}
          summaryData={summaryData}
          onFilterChange={setFilters}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportDevelopersToCSV(filteredPerformers, summaryData, currencyConfig)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <QuickStats
            liveData={liveData}
            summaryData={summaryData}
            currencyConfig={currencyConfig}
            isLoading={liveLoading && !hasLoadedOnce}
          />
          <RecognitionSection
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            currencyConfig={currencyConfig}
            onDeveloperClick={handleDeveloperClick}
          />
          <DeveloperTrends
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            currencyConfig={currencyConfig}
          />
          <HistoricalAnalysis
            startDate={startDate}
            endDate={endDate}
            summaryData={summaryData}
            summaryLoading={summaryLoading}
            currencyConfig={currencyConfig}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            onQuickRange={onQuickRange}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-6">
          <TeamBalance
            topPerformers={filteredPerformers}
            summaryData={summaryData}
          />
          <ActivityPatterns liveData={liveData} summaryData={summaryData} />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6 mt-6">
          <DeveloperContributions
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            isLoading={summaryLoading}
            currencyConfig={currencyConfig}
            onDeveloperClick={handleDeveloperClick}
          />
          <ExpertiseMatrix
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            currencyConfig={currencyConfig}
          />
          <ProjectImpact
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            currencyConfig={currencyConfig}
          />
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6 mt-6">
          <DeveloperSearch
            topPerformers={filteredPerformers}
            summaryData={summaryData}
            onSelectDeveloper={handleDeveloperClick}
          />
          <SkillsDiscovery
            topPerformers={filteredPerformers}
            summaryData={summaryData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
