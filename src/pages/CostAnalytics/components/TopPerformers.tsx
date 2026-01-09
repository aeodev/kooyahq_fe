import { Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { TopPerformer, CurrencyConfig } from '@/types/cost-analytics'
import { TopPerformersSkeleton } from './Skeletons'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface TopPerformersProps {
  topPerformers: TopPerformer[]
  isLoading?: boolean
  currencyConfig: CurrencyConfig
}

export function TopPerformers({ topPerformers, isLoading, currencyConfig }: TopPerformersProps) {
  if (isLoading) {
    return <TopPerformersSkeleton />
  }

  if (!topPerformers || topPerformers.length === 0) return null

  const displayPerformers = topPerformers.slice(0, 10)

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Contributors</h3>
          <Badge variant="secondary">Top {displayPerformers.length}</Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {displayPerformers.map((performer, i) => {
            const rankStyles: Record<number, string> = {
              0: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
              1: 'bg-muted text-muted-foreground border-border',
              2: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
            }
            const rankClass = rankStyles[i] || 'bg-muted text-muted-foreground border-border'

            return (
              <motion.div
                key={performer.userId}
                variants={staggerItem}
                transition={{ delay: i * 0.05, ...transitionNormal }}
                className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${rankClass}`}
                >
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{performer.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {performer.position || 'Developer'} · {performer.projectCount} project
                    {performer.projectCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(performer.totalCost, currencyConfig)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatHours(performer.totalHours)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}
