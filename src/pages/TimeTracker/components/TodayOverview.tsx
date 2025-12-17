import { Clock, ListTodo, Calendar, TrendingUp, Flame, Target, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMemo } from 'react'

type Entry = {
  id: string
  project: string
  tasks: { task: string; timestamp?: string }[]
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

function parseDurationToMinutes(duration: string): number {
  const hourMatch = duration.match(/(\d+)h/)
  const minMatch = duration.match(/(\d+)m/)
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0
  const mins = minMatch ? parseInt(minMatch[1]) : 0
  return hours * 60 + mins
}

// Animated Progress Ring with gradient
function ProgressRing({ 
  progress, 
  size = 96, 
  strokeWidth = 8,
}: { 
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" />
            <stop offset="50%" stopColor="rgb(34, 197, 94)" />
            <stop offset="100%" stopColor="rgb(20, 184, 166)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground tabular-nums">
          {Math.min(Math.round(progress), 999)}%
        </span>
        <span className="text-xs text-muted-foreground">
          {progress >= 100 ? 'Complete!' : 'of goal'}
        </span>
      </div>
    </div>
  )
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

  const productivityLevel = useMemo(() => {
    if (progressPercent >= 100) return { label: 'Excellent', color: 'text-emerald-500', icon: Flame }
    if (progressPercent >= 75) return { label: 'Great', color: 'text-emerald-500', icon: TrendingUp }
    if (progressPercent >= 50) return { label: 'Good', color: 'text-foreground', icon: Target }
    if (progressPercent >= 25) return { label: 'On track', color: 'text-muted-foreground', icon: Target }
    return { label: 'Starting', color: 'text-muted-foreground', icon: Timer }
  }, [progressPercent])

  const ProductivityIcon = productivityLevel.icon
  
  return (
    <Card className="border-border/50 h-full bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span>Today's Overview</span>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${productivityLevel.color}`}>
            <ProductivityIcon className="h-4 w-4" />
            <span>{productivityLevel.label}</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Ring + Stats Row */}
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <ProgressRing progress={progressPercent} />
          </div>
          
          <div className="flex-1 space-y-4">
            {/* Total Hours - Hero stat */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Total Time</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totalHours || '0h 0m'}</p>
            </div>
            
            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ListTodo className="h-3 w-3" />
                  <span className="text-xs">Entries</span>
                </div>
                <p className="text-base font-semibold text-foreground tabular-nums">{entryCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Timer className="h-3 w-3" />
                  <span className="text-xs">Average</span>
                </div>
                <p className="text-base font-semibold text-foreground tabular-nums">{avgTimeFormatted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Daily Goal</span>
            <span className="text-xs font-medium text-foreground tabular-nums">
              {totalHours} / {dailyGoalHours}h
            </span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Recent Activity
          </h4>
          {displayEntries.length > 0 ? (
            <div className="space-y-2">
              {displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="group p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/30 hover:border-border transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {entry.project}
                        </span>
                        {entry.isActive && (
                          <Badge className="text-xs py-0 px-2 bg-emerald-500/10 text-emerald-600 border-0">
                            Live
                          </Badge>
                        )}
                        {entry.isOvertime && (
                          <Badge className="text-xs py-0 px-2 bg-amber-500/10 text-amber-600 border-0">
                            OT
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1 pl-4">
                        {entry.tasks.length > 0 ? entry.tasks[0].task : 'No task'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">{entry.duration}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 rounded-lg border border-dashed border-border/50 bg-muted/10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Timer className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start tracking your work to see progress</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
