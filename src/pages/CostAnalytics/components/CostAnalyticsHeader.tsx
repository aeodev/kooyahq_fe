import { RefreshCw, Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CURRENCIES } from '@/types/cost-analytics'
import type { CostSummaryData, ProjectCostSummary, LiveCostData, ViewMode } from '@/types/cost-analytics'
import {
  exportSummaryToCSV,
  exportProjectDetailToCSV,
  exportComparisonToCSV,
  exportLiveDataToCSV,
  downloadCSV,
} from '@/utils/cost-analytics-export.utils'

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
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cost Analytics</h1>
        <p className="text-sm text-muted-foreground">Real-time business spending insights</p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as keyof typeof CURRENCIES)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
        >
          {Object.entries(CURRENCIES).map(([code, config]) => (
            <option key={code} value={code}>
              {config.symbol} {code}
            </option>
          ))}
        </select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!canExportSummary && !canExportLive}>
              <Download className="h-4 w-4 mr-2" />
              Export
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

        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </header>
  )
}
