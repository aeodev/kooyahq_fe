import { Link } from 'react-router-dom'
import { Play, Pause, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTimerDuration } from '@/hooks/time-entry.hooks'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import type { TimeEntry, AnalyticsData } from '@/types/time-entry'

interface HeroSectionProps {
  activeTimer: TimeEntry | null
  analytics: AnalyticsData | null
  canViewAnalytics: boolean
}

export function HeroSection({ activeTimer, analytics, canViewAnalytics }: HeroSectionProps) {
  const timerDuration = useTimerDuration(activeTimer)
  const stopTimer = useTimeEntryStore(state => state.stopTimer)
  
  const dailyGoalPercent = analytics 
    ? Math.min(Math.round((analytics.totalHours / 8) * 100), 100) 
    : 0

  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Left: Timer State */}
          <div className="flex-1 text-center md:text-left space-y-4">
            {activeTimer?.isActive ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    <span className="text-sm font-medium text-primary uppercase tracking-wider">Tracking Time</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums text-foreground">
                    {timerDuration}
                  </h2>
                  <div className="space-y-1">
                     <p className="text-lg font-medium text-foreground/90 truncate max-w-md mx-auto md:mx-0">
                      {activeTimer.tasks[activeTimer.tasks.length - 1]?.text || 'No task description'}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {activeTimer.projects.join(', ') || 'No Project'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                   <Button 
                    variant="destructive" 
                    size="lg"
                    className="h-12 px-8 rounded-full shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all"
                    onClick={() => stopTimer()}
                  >
                    <Square className="h-5 w-5 mr-2 fill-current" />
                    Stop
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    asChild
                    className="h-12 rounded-full border-primary/20 hover:bg-primary/5"
                  >
                    <Link to="/time-tracker">
                      View Details
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    Ready to work?
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Start tracking your time to stay productive.
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                    asChild
                  >
                    <Link to="/time-tracker">
                      <Play className="h-6 w-6 mr-2 fill-current" />
                      Start Timer
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Right: Stats Circle (only if allowed) */}
          {canViewAnalytics && (
            <div className="relative shrink-0">
               {/* Simple Circular Progress Presentation */}
               <div className="relative h-48 w-48 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      className="text-muted/20"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={263.89}
                      strokeDashoffset={263.89 - (dailyGoalPercent / 100) * 263.89}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-4xl font-bold tabular-nums">
                      {analytics ? Math.round(analytics.totalHours * 10) / 10 : 0}
                    </span>
                    <span className="text-xs uppercase font-semibold text-muted-foreground">Hours Today</span>
                  </div>
               </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

