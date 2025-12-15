import { Clock, ListTodo, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
}

export function TodayOverview({ totalHours, entryCount, recentEntries }: TodayOverviewProps) {
  // Get the 3 most recent entries
  const displayEntries = recentEntries.slice(0, 3)
  
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today's Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Total Time</span>
            </div>
            <p className="text-xl font-bold text-foreground">{totalHours || '0h 0m'}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ListTodo className="h-4 w-4" />
              <span className="text-xs font-medium">Entries</span>
            </div>
            <p className="text-xl font-bold text-foreground">{entryCount}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Recent Activity</h4>
          {displayEntries.length > 0 ? (
            <div className="space-y-2">
              {displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {entry.project}
                        </span>
                        {entry.isActive && (
                          <Badge variant="default" className="text-xs py-0 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">
                            Active
                          </Badge>
                        )}
                        {entry.isOvertime && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">
                            OT
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.tasks.length > 0 ? entry.tasks[0].task : 'No task'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-foreground">{entry.duration}</p>
                      <p className="text-xs text-muted-foreground">{entry.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-border/60 bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">No entries yet today</p>
              <p className="text-xs text-muted-foreground mt-1">Start a timer to track your work</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

