import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import type { TimeEntry } from '@/types/time-entry'

interface ActivityFeedProps {
  entries: TimeEntry[]
  todayTotalMinutes: number
  className?: string
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function ActivityFeed({ entries, todayTotalMinutes, className }: ActivityFeedProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        <Link to="/time-tracker" className="text-sm text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-muted-foreground border-b pb-2">
              <span>Today's Total</span>
              <span className="font-medium text-foreground">{formatDuration(todayTotalMinutes)}</span>
            </div>
            
            <div className="space-y-4">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-4 group">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                      {entry.tasks[entry.tasks.length - 1]?.text || 'No task description'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.projects.join(', ') || 'No Project'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                     <span className={`text-sm font-mono ${entry.isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {entry.isActive ? 'Active' : formatDuration(entry.duration)}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No activity recorded today.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
