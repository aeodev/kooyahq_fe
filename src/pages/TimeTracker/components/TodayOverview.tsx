import { ListTodo, Timer, Zap, Coffee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CoffeeCup } from './CoffeeCup'
import type { TaskItem } from '@/types/time-entry'
import { useMemo } from 'react'

type Entry = {
  id: string
  project: string
  tasks: TaskItem[]
  duration: string
  time: string
  isOvertime?: boolean
  isActive?: boolean
}

type TodayOverviewProps = {
  totalHours: string
  entryCount: number
  recentEntries: Entry[]
  dailyGoalHours?: number
}

// Parse duration string like "2h 30m" or "45m" to minutes
function parseDurationToMinutes(duration: string): number {
  const hourMatch = duration.match(/(\d+)h/)
  const minMatch = duration.match(/(\d+)m/)
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const mins = minMatch ? parseInt(minMatch[1]) : 0
  return hours * 60 + mins
}

export function TodayOverview({ 
  totalHours, 
  entryCount, 
  recentEntries,
  dailyGoalHours = 8 
}: TodayOverviewProps) {
  const displayEntries = recentEntries.slice(0, 3)
  
  const totalMinutes = useMemo(() => parseDurationToMinutes(totalHours), [totalHours])
  const goalMinutes = dailyGoalHours * 60
  const progressPercent = goalMinutes > 0 ? (totalMinutes / goalMinutes) * 100 : 0
  
  const avgTimePerEntry = entryCount > 0 ? Math.round(totalMinutes / entryCount) : 0
  const avgTimeFormatted = avgTimePerEntry >= 60 
    ? `${Math.floor(avgTimePerEntry / 60)}h ${avgTimePerEntry % 60}m`
    : `${avgTimePerEntry}m`

  return (
    <Card className="border-border h-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Coffee className="h-4 w-4 text-primary" />
          <span>Today's Brew</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 px-4 pb-4">
        {/* Coffee Cup + Stats */}
        <div className="flex items-start gap-4">
          {/* Coffee Cup Visualization */}
          <div className="flex-shrink-0">
            <CoffeeCup progress={progressPercent} />
          </div>
          
          {/* Stats Column */}
          <div className="flex-1 space-y-3 pt-1">
            {/* Total Time - Large */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Time Logged
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight mt-0.5">
                {totalHours || '0h 0m'}
              </p>
            </div>
            
            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ListTodo className="h-3 w-3" />
                  <span className="text-[9px] font-medium uppercase tracking-wide">Entries</span>
                </div>
                <p className="text-lg font-semibold text-foreground leading-tight mt-0.5">{entryCount}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span className="text-[9px] font-medium uppercase tracking-wide">Avg</span>
                </div>
                <p className="text-lg font-semibold text-foreground leading-tight mt-0.5">{avgTimeFormatted}</p>
              </div>
            </div>
            
            {/* Goal Progress */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Goal</span>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {totalHours} / {dailyGoalHours}h
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            Recent Activity
          </h4>
          {displayEntries.length > 0 ? (
            <div className="space-y-1.5">
              {displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group p-2.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                        <span className="text-[13px] font-medium text-foreground truncate leading-tight">
                          {entry.project}
                        </span>
                        {entry.isActive && (
                          <Badge variant="default" className="text-[9px] py-0 px-1 h-4 bg-primary/10 text-primary border-primary/20">
                            Live
                          </Badge>
                        )}
                        {entry.isOvertime && (
                          <Badge className="text-[9px] py-0 px-1 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            OT
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 pl-3">
                        {entry.tasks.length > 0 ? entry.tasks[0].text : 'No task'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-semibold text-foreground tabular-nums leading-tight">{entry.duration}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{entry.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 px-4 rounded-lg border border-dashed border-border bg-muted/10 text-center">
              <Timer className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No entries yet</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Start tracking your work</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
