import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { PeriodComparison, CurrencyConfig } from '@/types/cost-analytics'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'
import { cn } from '@/utils/cn'

interface PeriodComparisonProps {
  comparison: PeriodComparison
  currencyConfig: CurrencyConfig
}

export function PeriodComparison({ comparison, currencyConfig }: PeriodComparisonProps) {
  const { current, previous, change } = comparison

  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4" />
    if (percentage < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getTrendColor = (percentage: number) => {
    if (percentage > 0) return 'text-red-600 dark:text-red-400'
    if (percentage < 0) return 'text-green-600 dark:text-green-400'
    return 'text-muted-foreground'
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* Current Period */}
      <motion.div variants={staggerItem} transition={transitionNormal}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Current Period</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(current.cost, currencyConfig)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatHours(current.hours)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Previous Period */}
      <motion.div variants={staggerItem} transition={transitionNormal}>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Previous Period</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(previous.cost, currencyConfig)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatHours(previous.hours)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Indicators */}
      <motion.div variants={staggerItem} transition={transitionNormal} className="md:col-span-2">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Change</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getTrendIcon(change.costPercentage ?? 0)}
                  <span className="text-xs text-muted-foreground">Cost Change</span>
                </div>
                <p className={cn('text-lg font-bold', getTrendColor(change.costPercentage ?? 0))}>
                  {(change.costPercentage ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(change.cost ?? 0, currencyConfig)}
                </p>
                <p className={cn('text-xs', getTrendColor(change.costPercentage ?? 0))}>
                  {(change.costPercentage ?? 0) >= 0 ? '+' : ''}
                  {(change.costPercentage ?? 0).toFixed(1)}%
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {getTrendIcon(change.hoursPercentage ?? 0)}
                  <span className="text-xs text-muted-foreground">Hours Change</span>
                </div>
                <p className={cn('text-lg font-bold', getTrendColor(change.hoursPercentage ?? 0))}>
                  {(change.hoursPercentage ?? 0) >= 0 ? '+' : ''}
                  {formatHours(change.hours ?? 0)}
                </p>
                <p className={cn('text-xs', getTrendColor(change.hoursPercentage ?? 0))}>
                  {(change.hoursPercentage ?? 0) >= 0 ? '+' : ''}
                  {(change.hoursPercentage ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
