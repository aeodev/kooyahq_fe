import { useState, useMemo } from 'react'
import { useCostAnalyticsStore } from '@/stores/cost-analytics.store'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'
import type { CurrencyConfig, TopPerformer } from '@/types/cost-analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistoricalAnalysis } from '../shared/HistoricalAnalysis'
import { DeveloperProfile } from './DeveloperProfile'
import { type DeveloperFilters } from './shared/DeveloperFilters'
import { exportDevelopersToCSV } from '@/utils/developer-export.utils'
import { Download, Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  currencyConfig: CurrencyConfig
  hasLoadedOnce: boolean
}

export function DeveloperSummaryView({
  currencyConfig,
  hasLoadedOnce,
}: DeveloperSummaryViewProps) {
  const { startDate, endDate, setStartDate, setEndDate, quickRange } = useCostAnalyticsContext()

  // Alias for HistoricalAnalysis component compatibility
  const onStartDateChange = setStartDate
  const onEndDateChange = setEndDate
  const onQuickRange = quickRange
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

      <div className="flex flex-row gap-2 items-center overflow-x-auto">
        {/* Search */}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search developers..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10 h-10"
          />
        </div>

        {/* Project Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-10 shrink-0">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Project</span>
              {filters.project && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filters.project.length > 8 ? filters.project.slice(0, 8) + '...' : filters.project}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilters({ ...filters, project: null })}>
              All Projects
            </DropdownMenuItem>
            {summaryData?.projectCosts.map((p) => p.project).map((project) => (
              <DropdownMenuItem
                key={project}
                onClick={() => setFilters({ ...filters, project })}
              >
                {project}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportDevelopersToCSV(filteredPerformers, summaryData, currencyConfig)}
          className="gap-2 h-10 shrink-0"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>

        {/* Clear Filters */}
        {filters.project && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, project: null })} className="gap-1.5 h-10 shrink-0">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none px-4 text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="team" className="flex-1 sm:flex-none px-4 text-xs sm:text-sm">Team</TabsTrigger>
            <TabsTrigger value="individual" className="flex-1 sm:flex-none px-4 text-xs sm:text-sm">Individual</TabsTrigger>
            <TabsTrigger value="discovery" className="flex-1 sm:flex-none px-4 text-xs sm:text-sm">Discovery</TabsTrigger>
          </TabsList>
        </div>

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
          <ActivityPatterns />
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
