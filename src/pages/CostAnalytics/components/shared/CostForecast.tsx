import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { CostForecast, CurrencyConfig } from '@/types/cost-analytics'
import { cn } from '@/utils/cn'

interface CostForecastProps {
  forecast: CostForecast
  currencyConfig: CurrencyConfig
}

export function CostForecast({ forecast, currencyConfig }: CostForecastProps) {
  const { projectedCost, projectedHours, daysRemaining, confidence, dailyAverage, trend } = forecast

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600 dark:text-red-400'
      case 'decreasing':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getConfidenceColor = () => {
    if (confidence >= 70) return 'bg-green-500'
    if (confidence >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Cost Forecast</h3>
            </div>
            <Badge variant="secondary" className="gap-1">
              <div className={cn('w-2 h-2 rounded-full', getConfidenceColor())} />
              {confidence}% confidence
            </Badge>
          </div>

          {/* Projected Cost */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <span className="text-xs text-muted-foreground">Projected Cost</span>
            </div>
            <p className={cn('text-2xl font-bold', getTrendColor())}>
              {formatCurrency(projectedCost, currencyConfig)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Over next {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Daily Average */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Daily Average</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(dailyAverage, currencyConfig)}/day
              </span>
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Trend:</span>
              <Badge variant="outline" className="gap-1">
                {getTrendIcon()}
                {trend === 'increasing' ? 'Increasing' : trend === 'decreasing' ? 'Decreasing' : 'Stable'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
