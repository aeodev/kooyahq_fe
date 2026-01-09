import { useState, useEffect, useMemo } from 'react'
import { Calendar, DollarSign, Clock, BarChart3, Users, GitCompare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { DATE_RANGE_PRESETS } from '@/constants/cost-analytics.constants'
import type { CostSummaryData, CurrencyConfig } from '@/types/cost-analytics'
import { SummaryStatsSkeleton } from '../Skeletons'
import { PeriodComparison } from './PeriodComparison'
import { usePeriodComparison } from '@/hooks/cost-analytics/usePeriodComparison'
import { useCostAnalyticsContext } from '@/contexts/CostAnalyticsContext'

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
  const [comparePeriods, setComparePeriods] = useState(false)
  const { comparePeriods: comparePeriodsFn, periodComparison } = usePeriodComparison()
  const { selectedProject } = useCostAnalyticsContext()

  // Calculate previous period dates
  const previousPeriodDates = useMemo(() => {
    if (!startDate || !endDate) return null
    
    const currentStart = new Date(startDate)
    const currentEnd = new Date(endDate)
    const periodDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))
    
    const previousEnd = new Date(currentStart)
    previousEnd.setDate(previousEnd.getDate() - 1)
    previousEnd.setHours(23, 59, 59, 999)
    
    const previousStart = new Date(previousEnd)
    previousStart.setDate(previousStart.getDate() - periodDays + 1)
    previousStart.setHours(0, 0, 0, 0)
    
    return {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0],
    }
  }, [startDate, endDate])

  useEffect(() => {
    if (comparePeriods && previousPeriodDates) {
      comparePeriodsFn(
        startDate,
        endDate,
        previousPeriodDates.start,
        previousPeriodDates.end,
        selectedProject ?? undefined
      )
    }
  }, [comparePeriods, startDate, endDate, previousPeriodDates, comparePeriodsFn, selectedProject])

  return (
    <>
      {/* Date Range Selector */}
      <Card className="border-border/50 bg-card/50">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Historical Analysis</h3>
                </div>
                <Button
                  variant={comparePeriods ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setComparePeriods(!comparePeriods)}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Periods
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
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
                  <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
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

          <div className="mt-4 sm:mt-6">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Quick Range</Label>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_PRESETS.map(({ label, days }) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickRange(days)}
                  className="h-9 px-3 text-xs font-medium"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Period Comparison */}
      {comparePeriods && periodComparison && (
        <div className="mt-4">
          <PeriodComparison comparison={periodComparison} currencyConfig={currencyConfig} />
        </div>
      )}

      {/* Summary Stats */}
      {summaryLoading && !summaryData ? (
        <SummaryStatsSkeleton />
      ) : summaryData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Total Cost</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {formatCurrency(summaryData.totalCost, currencyConfig)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Total Hours</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {formatHours(summaryData.totalHours)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Projects</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {summaryData.projectCosts.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Contributors</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {summaryData.topPerformers.length}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
