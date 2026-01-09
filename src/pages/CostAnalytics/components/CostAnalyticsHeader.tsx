import { Download, FileDown } from 'lucide-react'
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
import { LastUpdated } from './shared/LastUpdated'

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
  lastUpdated: Date | null
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
  const currencyConfig = CURRENCIES[currency]

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
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cost Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time business spending insights</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as keyof typeof CURRENCIES)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium min-w-[100px]"
          >
            {Object.entries(CURRENCIES).map(([code, config]) => (
              <option key={code} value={code}>
                {config.symbol} {code}
              </option>
            ))}
          </select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canExportSummary && !canExportLive} className="gap-2">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'projects' | 'developers')}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="projects" className="flex-1 sm:flex-none">Projects</TabsTrigger>
            <TabsTrigger value="developers" className="flex-1 sm:flex-none">Developers</TabsTrigger>
          </TabsList>
        </Tabs>
        <LastUpdated timestamp={lastUpdated} />
      </div>
    </header>
  )
}
