import { Download, FileDown, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CURRENCIES } from '@/types/cost-analytics'
import type { CostSummaryData, ProjectCostSummary, LiveCostData, ViewMode } from '@/types/cost-analytics'
import {
  exportSummaryToCSV,
  exportProjectDetailToCSV,
  exportComparisonToCSV,
  exportLiveDataToCSV,
  downloadCSV,
} from '@/utils/cost-analytics-export.utils'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

interface CostAnalyticsHeaderProps {
  currency: keyof typeof CURRENCIES
  onCurrencyChange: (currency: keyof typeof CURRENCIES) => void
  onRefresh: () => void
  isLoading: boolean
  viewMode: ViewMode
  summaryData: CostSummaryData | null
  projectDetail: ProjectCostSummary | null
  compareData: ProjectCostSummary[]
  liveData: LiveCostData | null
  selectedProject: string | null
  activeTab: 'projects' | 'developers'
  onTabChange: (tab: 'projects' | 'developers') => void
  lastUpdated?: Date | null
}

export function CostAnalyticsHeader({
  currency,
  onCurrencyChange,
  onRefresh,
  isLoading,
  viewMode,
  summaryData,
  projectDetail,
  compareData,
  liveData,
  selectedProject,
  activeTab,
  onTabChange,
  lastUpdated,
}: CostAnalyticsHeaderProps) {
  const can = useAuthStore((state) => state.can)
  const canExport = can(PERMISSIONS.COST_ANALYTICS_EDIT) || can(PERMISSIONS.COST_ANALYTICS_FULL_ACCESS)

  const currencyConfig = CURRENCIES[currency]
  const lastUpdatedLabel = lastUpdated ? lastUpdated.toLocaleString() : 'Not updated yet'

  const handleExportSummary = () => {
    if (!summaryData) return
    const csv = exportSummaryToCSV(summaryData, currencyConfig)
    const filename = `cost-analytics-summary-${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const handleExportProjectDetail = () => {
    if (!projectDetail) return
    const csv = exportProjectDetailToCSV(projectDetail, currencyConfig)
    const filename = `cost-analytics-project-${selectedProject?.replace(/[^a-z0-9]/gi, '-') || 'detail'}-${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const handleExportComparison = () => {
    if (compareData.length === 0) return
    const csv = exportComparisonToCSV(compareData, currencyConfig)
    const filename = `cost-analytics-comparison-${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const handleExportLiveData = () => {
    if (!liveData) return
    const csv = exportLiveDataToCSV(liveData, currencyConfig)
    const filename = `cost-analytics-live-${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const canExportSummary = summaryData !== null
  const canExportProjectDetail = viewMode === 'single' && projectDetail !== null
  const canExportComparison = viewMode === 'compare' && compareData.length > 0
  const canExportLive = liveData !== null

  return (
    <header className="space-y-4">
      {/* Title Section */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cost Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time business spending insights</p>
        </div>

        {/* Top Actions - Right aligned */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Currency selector as proper dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-w-[100px]">
                <span className="font-medium">{currencyConfig.symbol} {currency}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(CURRENCIES).map(([code, config]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => onCurrencyChange(code as keyof typeof CURRENCIES)}
                  className={currency === code ? 'bg-primary/10' : ''}
                >
                  <span className="font-medium">{config.symbol} {code}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          {/* Export button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={(!canExportSummary && !canExportLive) || !canExport} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canExportSummary && (
                <DropdownMenuItem onClick={handleExportSummary}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Summary (CSV)
                </DropdownMenuItem>
              )}
              {canExportProjectDetail && (
                <DropdownMenuItem onClick={handleExportProjectDetail}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Project Detail (CSV)
                </DropdownMenuItem>
              )}
              {canExportComparison && (
                <DropdownMenuItem onClick={handleExportComparison}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Comparison (CSV)
                </DropdownMenuItem>
              )}
              {canExportLive && (
                <DropdownMenuItem onClick={handleExportLiveData}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Live Data (CSV)
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs and Last Updated - Better alignment */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'projects' | 'developers')}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="projects" className="flex-1 sm:flex-none">Projects</TabsTrigger>
            <TabsTrigger value="developers" className="flex-1 sm:flex-none">Developers</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-xs text-muted-foreground">
          {isLoading ? 'Refreshing...' : `Last updated: ${lastUpdatedLabel}`}
        </div>
      </div>
    </header>
  )
}
