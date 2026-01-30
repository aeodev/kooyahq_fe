import { BarChart3, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { convertFromPHPSync } from '@/utils/currency-converter'
import type { ProjectCostSummary, CurrencyConfig } from '@/types/cost-analytics'
import { ErrorState } from '../EmptyStates'
import { SummaryStatsSkeleton, TableSkeleton } from '../Skeletons'
import { slideInRight, staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'

interface ProjectDetailViewProps {
  projectName: string
  projectDetail: ProjectCostSummary | null
  projectDetailLoading: boolean
  projectDetailError: string | null
  currencyConfig: CurrencyConfig
}

export function ProjectDetailView({
  projectName,
  projectDetail,
  projectDetailLoading,
  projectDetailError,
  currencyConfig,
}: ProjectDetailViewProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={slideInRight}
      transition={transitionNormal}
    >
      <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Project: {projectName}</h3>
          </div>
          {projectDetailLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      <CardContent className="p-4">
        {projectDetailError ? (
          <ErrorState message={projectDetailError} />
        ) : projectDetailLoading ? (
          <div className="space-y-4">
            <SummaryStatsSkeleton />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted/30 rounded" />
              <TableSkeleton rows={5} />
            </div>
          </div>
        ) : projectDetail ? (
          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Project Stats */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div
                variants={staggerItem}
                className="p-3 rounded-lg border border-border/50 bg-background"
              >
                <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(projectDetail.totalCost, currencyConfig)}
                </p>
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="p-3 rounded-lg border border-border/50 bg-background"
              >
                <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                <p className="text-xl font-bold text-foreground">
                  {formatHours(projectDetail.totalHours)}
                </p>
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="p-3 rounded-lg border border-border/50 bg-background"
              >
                <p className="text-xs text-muted-foreground mb-1">Developers</p>
                <p className="text-xl font-bold text-foreground">
                  {projectDetail.developers.length}
                </p>
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="p-3 rounded-lg border border-border/50 bg-background"
              >
                <p className="text-xs text-muted-foreground mb-1">Avg Rate</p>
                <p className="text-xl font-bold text-foreground">
                  {currencyConfig.symbol}
                  {convertFromPHPSync(projectDetail.avgHourlyRate ?? 0, currencyConfig.code).toFixed(0)}/hr
                </p>
              </motion.div>
            </motion.div>

            {/* Developer Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Developer Breakdown</h4>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Developer</th>
                      <th className="text-right py-2 px-3 font-medium">Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Hours</th>
                      <th className="text-right py-2 px-3 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                      {projectDetail.developers.map((dev) => (
                      <tr key={dev.userId} className="border-t border-border/50">
                        <td className="py-2 px-3 text-sm text-foreground">{dev.userName}</td>
                        <td className="py-2 px-3 text-right text-sm text-muted-foreground">
                          {currencyConfig.symbol}
                          {convertFromPHPSync(dev.hourlyRate ?? 0, currencyConfig.code).toFixed(0)}/hr
                        </td>
                        <td className="py-2 px-3 text-right text-sm text-foreground">
                          {formatHours(dev.hours ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-right text-sm font-medium text-primary">
                          {formatCurrency(dev.cost ?? 0, currencyConfig)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : null}
      </CardContent>
    </Card>
    </motion.div>
  )
}
