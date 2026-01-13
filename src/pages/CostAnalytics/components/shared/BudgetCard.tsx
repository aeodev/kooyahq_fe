import { AlertTriangle, TrendingUp, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { cn } from '@/utils/cn'
import type { BudgetComparison, CurrencyConfig } from '@/types/cost-analytics'

interface BudgetCardProps {
  comparison: BudgetComparison
  currencyConfig: CurrencyConfig
  canEdit?: boolean
  onEdit: (budget: BudgetComparison['budget']) => void
  onDelete: (budgetId: string) => void
}

export function BudgetCard({ comparison, currencyConfig, canEdit = false, onEdit, onDelete }: BudgetCardProps) {
  const { budget, actualCost, remainingBudget, utilizationPercentage, alertLevel, remainingDays } = comparison

  const getAlertColor = () => {
    switch (alertLevel) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400'
      default:
        return 'text-green-600 dark:text-green-400'
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-foreground">
                  {budget.project || 'Team-wide Budget'}
                </h4>
                {alertLevel !== 'ok' && (
                  <Badge
                    variant={alertLevel === 'critical' ? 'destructive' : 'secondary'}
                    className="gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {alertLevel === 'critical' ? 'Critical' : 'Warning'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(budget.startDate).toLocaleDateString()} -{' '}
                {new Date(budget.endDate).toLocaleDateString()}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(budget)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(budget.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilization</span>
              <span className={cn('font-semibold', getAlertColor())}>
                {utilizationPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(100, utilizationPercentage)} className="h-2" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Budget</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(budget.amount, currencyConfig)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Actual</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(actualCost, currencyConfig)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p
                className={cn(
                  'text-sm font-semibold',
                  remainingBudget < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                )}
              >
                {formatCurrency(remainingBudget, currencyConfig)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Days Left</p>
              <p className="text-sm font-semibold text-foreground">{remainingDays}</p>
            </div>
          </div>

          {/* Projected Overspend Warning */}
          {comparison.projectedOverspend > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Projected overspend: {formatCurrency(comparison.projectedOverspend, currencyConfig)}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
