import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Square, Clock, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTimerDuration } from '@/hooks/time-entry.hooks'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { cn } from '@/utils/cn'
import type { TimeEntry } from '@/types/time-entry'

interface HeroSectionProps {
  activeTimer: TimeEntry | null
  todayEntries: TimeEntry[]
  className?: string
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

export function HeroSection({ 
  activeTimer, 
  todayEntries,
  className 
}: HeroSectionProps) {
  const timerDuration = useTimerDuration(activeTimer)
  const stopTimer = useTimeEntryStore(state => state.stopTimer)
  
  // Show up to 4 recent sessions
  const recentEntries = todayEntries.filter(e => !e.isActive).slice(0, 4)

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          
          {/* Left Column - Timer Core */}
          <div className={cn(
            "relative flex-1 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border/20 lg:basis-1/2",
          )}>
            {/* Active timer glow effect */}
            {activeTimer?.isActive && (
              <div 
                className="absolute inset-0 -z-10 opacity-50 dark:opacity-30"
                style={{
                  background: 'radial-gradient(ellipse at top left, hsl(var(--primary) / 0.08) 0%, transparent 50%)'
                }}
              />
            )}

            {activeTimer?.isActive ? (
              <div className="space-y-5">
                {/* Active Timer Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em]">
                      Tracking
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                    asChild
                  >
                    <Link to="/time-tracker">
                      Details <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                {/* Timer Display - NO SPACES around colon */}
                <div className="space-y-3">
                  <h2 className="text-5xl md:text-6xl font-black tracking-tighter tabular-nums text-foreground font-mono leading-none">
                    {timerDuration}
                  </h2>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground/90 truncate max-w-sm">
                      {activeTimer.tasks[activeTimer.tasks.length - 1]?.text || 'No task description'}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {activeTimer.projects.join(', ') || 'No Project'}
                    </p>
                  </div>
                </div>

                {/* Stop Button - RED for destructive action */}
                <Button 
                  size="default"
                  className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all"
                  onClick={() => stopTimer()}
                >
                  <Square className="h-3.5 w-3.5 mr-2 fill-current" />
                  Stop Timer
                </Button>
              </div>
            ) : (
              /* Idle State */
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary/60" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ready to focus</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Start tracking your time
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Track what you're working on to stay productive and build momentum.
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all shrink-0"
                  asChild
                >
                  <Link to="/time-tracker">
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Start Timer
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Recent Sessions */}
          <div className="flex-1 p-6 lg:p-8 min-w-0 lg:basis-1/2 bg-muted/10 dark:bg-muted/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.1em]">
                    Recent Sessions
                  </span>
                </div>
                <Link 
                  to="/time-tracker" 
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {recentEntries.length > 0 ? (
                <div className="space-y-1">
                  {recentEntries.map((entry, index) => (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group flex items-center gap-4 p-3 -mx-2 rounded-xl hover:bg-background/50 dark:hover:bg-background/30 transition-all duration-200"
                    >
                      <div className="w-1 h-10 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold truncate text-foreground/90 group-hover:text-foreground transition-colors">
                          {entry.tasks[entry.tasks.length - 1]?.text || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{entry.projects[0] || 'No Project'}</span>
                          <span className="text-muted-foreground/40">•</span>
                          <span>{entry.startTime ? formatTime(new Date(entry.startTime)) : 'N/A'}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold font-mono text-muted-foreground tabular-nums shrink-0 group-hover:text-foreground transition-colors">
                        {formatDuration(entry.duration)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                    <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No sessions yet today</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start your first session to build momentum</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
