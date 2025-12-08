import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TaskItem } from '@/types/time-entry'
import { formatDuration } from './utils'

type DisplayEntry = {
  id: string
  project: string
  tasks: TaskItem[]
  duration: string
  time: string
  isOvertime?: boolean
  isActive?: boolean
}

type EntryListProps = {
  entries: DisplayEntry[]
}

// Component for live task duration display
function LiveTaskDuration({ task, isLastTask, isActive }: { 
  task: TaskItem
  isLastTask: boolean
  isActive: boolean 
}) {
  const [liveDuration, setLiveDuration] = useState(task.duration)

  useEffect(() => {
    // Only calculate live for the last task of an active entry
    if (!isLastTask || !isActive) {
      setLiveDuration(task.duration)
      return
    }

    const calculateLiveDuration = () => {
      const addedAt = new Date(task.addedAt)
      const now = new Date()
      const minutes = Math.floor((now.getTime() - addedAt.getTime()) / 60000)
      setLiveDuration(minutes)
    }

    calculateLiveDuration()
    const interval = setInterval(calculateLiveDuration, 1000)

    return () => clearInterval(interval)
  }, [task.addedAt, task.duration, isLastTask, isActive])

  return (
    <span className="text-xs text-muted-foreground whitespace-nowrap">
      {formatDuration(liveDuration)}
    </span>
  )
}

// Component for live total duration display
function LiveTotalDuration({ entry }: { entry: DisplayEntry }) {
  const [liveDuration, setLiveDuration] = useState(entry.duration)

  useEffect(() => {
    if (!entry.isActive || entry.tasks.length === 0) {
      setLiveDuration(entry.duration)
      return
    }

    const calculateLiveDuration = () => {
      // Sum up all completed task durations
      const completedDuration = entry.tasks.slice(0, -1).reduce((sum, t) => sum + t.duration, 0)
      
      // Calculate live duration for last task
      const lastTask = entry.tasks[entry.tasks.length - 1]
      const addedAt = new Date(lastTask.addedAt)
      const now = new Date()
      const lastTaskMinutes = Math.floor((now.getTime() - addedAt.getTime()) / 60000)
      
      setLiveDuration(formatDuration(completedDuration + lastTaskMinutes))
    }

    calculateLiveDuration()
    const interval = setInterval(calculateLiveDuration, 1000)

    return () => clearInterval(interval)
  }, [entry])

  return (
    <p className="text-lg font-semibold text-foreground whitespace-nowrap">{liveDuration}</p>
  )
}

export function EntryList({ entries }: EntryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 hover:bg-card/70 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="border border-border/60 rounded-lg p-3 bg-background/50">
                    <div className="space-y-2">
                      {entry.tasks.map((task, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm font-medium text-foreground truncate">
                              {task.text}
                            </span>
                          </div>
                          <LiveTaskDuration 
                            task={task} 
                            isLastTask={index === entry.tasks.length - 1}
                            isActive={entry.isActive ?? false}
                          />
                        </div>
                      ))}
                      {entry.tasks.length === 0 && (
                        <p className="text-sm text-muted-foreground">No tasks</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm text-muted-foreground">{entry.project}</p>
                    {entry.isOvertime && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                        Overtime
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{entry.time}</p>
                </div>
                <div className="text-right">
                  <LiveTotalDuration entry={entry} />
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No entries yet today</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
