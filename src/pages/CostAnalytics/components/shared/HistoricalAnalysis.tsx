import { Calendar, DollarSign, Clock, BarChart3, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCompactCurrency } from '@/stores/cost-analytics.store'
import { getDateRange } from '@/utils/date'
import { DATE_RANGE_PRESETS } from '@/constants/cost-analytics.constants'
import type { CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { SummaryStatsSkeleton } from '../Skeletons'

interface HistoricalAnalysisProps {
  startDate: string
  endDate: string
  summaryData: CostSummaryData | null
  summaryLoading: boolean
  currencyConfig: CurrencyConfig
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onQuickRange: (days: number) => void
}

export function HistoricalAnalysis({
  startDate,
  endDate,
  summaryData,
  summaryLoading,
  currencyConfig,
  onStartDateChange,
  onEndDateChange,
  onQuickRange,
}: HistoricalAnalysisProps) {
  return (
    <>
      {/* Date Range Selector */}
      <Card className="border-border/50 bg-card/50">
        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Historical Analysis</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {DATE_RANGE_PRESETS.map(({ label, days }) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                onClick={() => onQuickRange(days)}
                className="h-8 px-4 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      {summaryLoading && !summaryData ? (
        <SummaryStatsSkeleton />
      ) : summaryData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Cost</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCompactCurrency(summaryData.totalCost, currencyConfig)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Hours</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatHours(summaryData.totalHours)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Projects</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {summaryData.projectCosts.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Contributors</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {summaryData.topPerformers.length}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
