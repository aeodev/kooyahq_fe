import { ListTodo, Timer, Zap, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
      <CardHeader className="pb-3 pt-5 px-5">        
      </CardHeader>
      
      <CardContent className="space-y-5 px-5 pb-5">
        {/* Coffee Cup + Stats */}
        <div className="flex items-start gap-5">
          {/* Coffee Cup Visualization */}
          <div className="flex-shrink-0">
            <CoffeeCup progress={progressPercent} />
          </div>
          
          {/* Stats Column */}
          <div className="flex-1 space-y-4 pt-1">
            {/* Total Time - Hero stat */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1">
                Time Logged
              </p>
              <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {totalHours || '0h 0m'}
              </p>
            </div>
            
            {/* Mini Stats - Cleaner grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Entries</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{entryCount}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Avg/Entry</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{avgTimeFormatted}</p>
              </div>
            </div>
            
            {/* Goal Progress - Cleaner bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Daily Goal</span>
                <span className="text-xs font-semibold text-foreground tabular-nums">
                  {totalHours} <span className="text-muted-foreground">/</span> {dailyGoalHours}h
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Fixed alignment */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Recent Activity
          </h4>
          {displayEntries.length > 0 ? (
            <div className="space-y-2">
              {displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    {/* Left: Project + Task */}
                    <div className="flex-1 min-w-0">
                      {/* Project name with badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {entry.project}
                        </span>
                        {entry.isActive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        )}
                        {entry.isOvertime && (
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-help"
                            title="Logged after ending your workday"
                          >
                            Overtime
                          </span>
                        )}
                      </div>
                      {/* Task description - show latest task */}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {entry.tasks.length > 0 ? entry.tasks[entry.tasks.length - 1].text : 'No task description'}
                      </p>
                    </div>
                    
                    {/* Right: Duration + Time - Fixed width for alignment */}
                    <div className="flex-shrink-0 text-right min-w-[70px]">
                      <p className="text-sm font-bold text-foreground tabular-nums">{entry.duration}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium tabular-nums">{entry.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20 text-center">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Timer className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start tracking your work</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
