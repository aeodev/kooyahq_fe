import { Flame, DollarSign, Clock, Users, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LivePulse } from './LivePulse'
import { formatHours } from '@/utils/cost-analytics.utils'
import { formatCurrency } from '@/stores/cost-analytics.store'
import type { LiveCostData, CurrencyConfig } from '@/types/cost-analytics'
import { NoDataState } from './EmptyStates'
import { LiveStatsSkeleton, ProjectCardsSkeleton, TableSkeleton } from './Skeletons'

interface LiveCostTrackingProps {
  liveData: LiveCostData | null
  currencyConfig: CurrencyConfig
  isLoading: boolean
}

export function LiveCostTracking({ liveData, currencyConfig, isLoading }: LiveCostTrackingProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <LivePulse />
          <h2 className="text-sm font-semibold text-foreground">Live Cost Tracking</h2>
          <span className="text-xs text-muted-foreground">
            {liveData?.timestamp ? new Date(liveData.timestamp).toLocaleTimeString() : '--'}
          </span>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Live Stats Grid */}
        {isLoading && !liveData ? (
          <LiveStatsSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border/50 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Burn Rate</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {currencyConfig.symbol}
                  {(liveData?.totalBurnRate || 0).toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal">/hr</span>
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/50 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Live Cost</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(liveData?.totalLiveCost || 0, currencyConfig)}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/50 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Active Hours</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatHours(liveData?.activeHours || 0)}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/50 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Active Devs</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {liveData?.activeDevelopers?.length || 0}
                </p>
              </div>
            </div>

            {/* Active Projects */}
            {liveData?.projectCosts && liveData.projectCosts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                {isLoading ? (
                  <ProjectCardsSkeleton />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {liveData.projectCosts.map((project) => (
                      <div key={project.project} className="p-3 rounded-lg border border-border/50 bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground truncate flex-1">{project.project}</h4>
                          <Badge variant="secondary" className="ml-2">
                            {project.developers} dev{project.developers !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-semibold text-primary">
                            {formatCurrency(project.liveCost, currencyConfig)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {currencyConfig.symbol}
                            {project.burnRate.toFixed(0)}/hr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      {liveData.activeDevelopers.map((dev) => (
                        <tr key={dev.userId} className="border-t border-border/50">
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
                            {dev.hourlyRate.toFixed(0)}/hr
                          </td>
                          <td className="py-2 px-3 text-right text-sm text-foreground">
                            {formatHours(dev.activeMinutes / 60)}
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium text-primary">
                            {formatCurrency(dev.liveCost, currencyConfig)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !isLoading && <NoDataState message="No active timers right now" />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
