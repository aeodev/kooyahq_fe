import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, DollarSign, Clock, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LivePulse } from '../LivePulse'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import { convertFromPHPSync } from '@/utils/currency-converter'
import type { LiveCostData, CurrencyConfig, CostSummaryData } from '@/types/cost-analytics'
import { NoDataState } from '../EmptyStates'
import { LiveStatsSkeleton, ProjectCardsSkeleton, TableSkeleton } from '../Skeletons'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'
import { OvertimeBreakdown } from './OvertimeBreakdown'

interface LiveCostTrackingProps {
  liveData: LiveCostData | null
  currencyConfig: CurrencyConfig
  isLoading: boolean
  summaryData?: CostSummaryData | null
}

export const LiveCostTracking = memo(function LiveCostTracking({ liveData, currencyConfig, isLoading, summaryData }: LiveCostTrackingProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <LivePulse />
          <h2 className="text-sm font-semibold text-foreground">Live Cost Tracking</h2>
          {/* <span className="text-xs text-muted-foreground">
            {liveData?.timestamp ? new Date(liveData.timestamp).toLocaleTimeString() : '--'}
          </span> */}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Live Stats Grid */}
        {isLoading && !liveData ? (
          <LiveStatsSkeleton />
        ) : (
          <>
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div
                variants={staggerItem}
                className="p-4 rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Flame className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Burn Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {currencyConfig.symbol}
                  {convertFromPHPSync(liveData?.totalBurnRate || 0, currencyConfig.code).toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal ml-1">/hr</span>
                </p>
              </motion.div>

              <motion.div
                variants={staggerItem}
                className="p-4 rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Live Cost</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(liveData?.totalLiveCost || 0, currencyConfig)}
                </p>
              </motion.div>

              <motion.div
                variants={staggerItem}
                className="p-4 rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Active Hours</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatHours(liveData?.activeHours || 0)}
                </p>
              </motion.div>

              <motion.div
                variants={staggerItem}
                className="p-4 rounded-lg border border-border/50 bg-gradient-to-br from-background to-muted/20 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Active Devs</p>
                <p className="text-2xl font-bold text-foreground">
                  {liveData?.activeDevelopers?.length || 0}
                </p>
              </motion.div>
            </motion.div>

            {/* Active Projects */}
            {liveData?.projectCosts && liveData.projectCosts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                {isLoading ? (
                  <ProjectCardsSkeleton />
                ) : (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <AnimatePresence>
                      {liveData.projectCosts.map((project) => (
                        <motion.div
                          key={project.project}
                          variants={staggerItem}
                          layout
                          transition={transitionNormal}
                          className="p-4 rounded-lg border border-border/50 bg-background hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                        >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1">
                            {project.project}
                          </h4>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {project.developers} dev{project.developers !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(project.liveCost, currencyConfig)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currencyConfig.symbol}
                            {convertFromPHPSync(project.burnRate, currencyConfig.code).toFixed(0)}/hr
                          </p>
                        </div>
                      </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            )}

            {/* Active Developers Table */}
            {isLoading ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Active Developers</h3>
                <TableSkeleton rows={5} />
              </div>
            ) : liveData?.activeDevelopers && liveData.activeDevelopers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Active Developers</h3>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-2 px-3 font-medium">Developer</th>
                        <th className="text-left py-2 px-3 font-medium">Projects</th>
                        <th className="text-right py-2 px-3 font-medium">Rate</th>
                        <th className="text-right py-2 px-3 font-medium">Time</th>
                        <th className="text-right py-2 px-3 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {liveData.activeDevelopers.map((dev, index) => (
                          <motion.tr
                            key={dev.userId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.05, ...transitionNormal }}
                            className="border-t border-border/50"
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${dev.isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                />
                                <span className="text-sm text-foreground">{dev.userName}</span>
                                {dev.isPaused && <span className="text-xs text-amber-500">(paused)</span>}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {dev.projects.slice(0, 2).map((p) => (
                                  <Badge key={p} variant="secondary" className="text-xs">
                                    {p}
                                  </Badge>
                                ))}
                                {dev.projects.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{dev.projects.length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-sm text-muted-foreground">
                              {currencyConfig.symbol}
                              {convertFromPHPSync(dev.hourlyRate, currencyConfig.code).toFixed(0)}/hr
                            </td>
                            <td className="py-2 px-3 text-right text-sm text-foreground">
                              {formatHours(dev.activeMinutes / 60)}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium text-primary">
                              {formatCurrency(dev.liveCost, currencyConfig)}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !isLoading && (
                <NoDataState 
                  message="No active timers right now"
                  suggestion="Try selecting a different date range or check back later"
                  icon={<Clock className="h-12 w-12 text-muted-foreground/50" />}
                />
              )
            )}

            {/* Overtime Breakdown */}
            {summaryData?.overtimeBreakdown && (
              <OvertimeBreakdown
                breakdown={summaryData.overtimeBreakdown}
                currencyConfig={currencyConfig}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
