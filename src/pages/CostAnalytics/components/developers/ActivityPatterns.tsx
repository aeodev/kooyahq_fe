import { useMemo } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAllEntriesQuery } from '@/hooks/queries/time-entry.queries'
import {
  calculateWeeklyPattern,
  calculateHourlyPattern,
  getActivityPercentage,
} from '@/utils/activity-patterns.utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, transitionNormal } from '@/utils/animations'
import { formatHours } from '@/utils/cost-analytics.utils'

export function ActivityPatterns() {
  // Fetch time entries for activity patterns
  const { data: timeEntries = [], isLoading } = useAllEntriesQuery(true)

  // Weekly pattern (team aggregate)
  const weeklyPattern = useMemo(() => {
    return calculateWeeklyPattern(timeEntries)
  }, [timeEntries])

  // Hourly pattern (team aggregate)
  const hourlyPattern = useMemo(() => {
    return calculateHourlyPattern(timeEntries)
  }, [timeEntries])

  const maxWeeklyActivity = Math.max(...weeklyPattern.map((p) => p.activity), 1)
  const maxHourlyActivity = Math.max(...hourlyPattern.map((h) => h.totalHours), 1)

  const hasData = timeEntries.length > 0

  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Activity Patterns</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Useful for planning meetings and collaboration windows
        </p>
      </div>
      <CardContent className="p-4">
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="hourly">Hourly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-4">
                Team activity by day of week (aggregate view)
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                      <div className="flex-1 h-8 bg-muted rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : !hasData ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No time entry data available for activity patterns
                </p>
              ) : (
                <motion.div
                  className="space-y-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {weeklyPattern.map((pattern, i) => {
                    const percentage = getActivityPercentage(pattern.activity, maxWeeklyActivity)
                    return (
                      <motion.div
                        key={pattern.day}
                        variants={staggerItem}
                        transition={{ delay: i * 0.05, ...transitionNormal }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-12 text-xs font-medium text-muted-foreground">
                          {pattern.day}
                        </div>
                        <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-primary/60 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium text-foreground">
                            <span>{formatHours(pattern.activity)}</span>
                            <span>{pattern.count} entries</span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="hourly" className="mt-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-4">
                Team activity by hour of day (aggregate view)
              </p>
              {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-3 w-8 bg-muted rounded animate-pulse" />
                      <div className="w-full h-12 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : !hasData ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No time entry data available for activity patterns
                </p>
              ) : (
                <motion.div
                  className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {hourlyPattern.map((hour, i) => {
                    const percentage = getActivityPercentage(hour.totalHours, maxHourlyActivity)
                    const hourLabel = hour.hour.toString().padStart(2, '0') + ':00'
                    return (
                      <motion.div
                        key={hour.hour}
                        variants={staggerItem}
                        transition={{ delay: i * 0.02, ...transitionNormal }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="text-xs text-muted-foreground">{hourLabel}</div>
                        <div
                          className="w-full bg-primary/60 rounded transition-all min-h-[40px] flex items-end justify-center relative group"
                          style={{ height: `${Math.max(percentage, 5)}%` }}
                          title={`${formatHours(hour.totalHours)} (${hour.count} entries)`}
                        >
                          {hour.totalHours > 0 && (
                            <span className="text-[10px] text-white font-medium mb-1">
                              {hour.totalHours.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Use these patterns to schedule team meetings and identify optimal collaboration windows.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
