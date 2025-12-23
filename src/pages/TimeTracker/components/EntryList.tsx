import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, ListTodo, ChevronDown, ChevronUp } from 'lucide-react'
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
  totalHours?: string
  entryCount?: number
}

// Component for live total duration display
function LiveTotalDuration({ entry, className }: { entry: DisplayEntry; className?: string }) {
  const [liveDuration, setLiveDuration] = useState(entry.duration)

  useEffect(() => {
    if (!entry.isActive || entry.tasks.length === 0) {
      setLiveDuration(entry.duration)
      return
    }

    const calculateLiveDuration = () => {
      const completedDuration = entry.tasks.slice(0, -1).reduce((sum, t) => sum + t.duration, 0)
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

  return <span className={className}>{liveDuration}</span>
}

// Expandable entry row component
function EntryRow({ entry }: { entry: DisplayEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasMultipleTasks = entry.tasks.length > 1
  const mainTask = entry.tasks.length > 0 ? entry.tasks[entry.tasks.length - 1].text : 'No task'

  return (
    <div className="group">
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${entry.isActive ? 'bg-primary/5' : ''}`}
        onClick={() => hasMultipleTasks && setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {entry.isActive ? (
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-muted-foreground/30" />
          )}
        </div>

        {/* Project & Task */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{entry.project}</span>
            {entry.isOvertime && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 border-orange-500/30">
                OT
              </Badge>
            )}
            {entry.isActive && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/30">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{mainTask}</p>
        </div>

        {/* Time range */}
        <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
          {entry.time}
        </div>

        {/* Duration */}
        <div className="text-right flex-shrink-0 min-w-[60px]">
          <LiveTotalDuration entry={entry} className="text-sm font-semibold text-foreground" />
        </div>

        {/* Expand indicator */}
        {hasMultipleTasks && (
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>

      {/* Expanded tasks */}
      {expanded && hasMultipleTasks && (
        <div className="ml-8 mr-3 mb-2 pl-3 border-l-2 border-muted space-y-1">
          {entry.tasks.map((task, index) => (
            <div key={index} className="flex items-center justify-between py-1 text-xs">
              <span className="text-muted-foreground truncate">{task.text}</span>
              <span className="text-muted-foreground whitespace-nowrap ml-2">
                {formatDuration(task.duration)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EntryList({ entries, totalHours, entryCount }: EntryListProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
      {/* Compact Header with Summary */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
        <h3 className="text-sm font-semibold text-foreground">Today's Activity</h3>
        <div className="flex items-center gap-4">
          {totalHours && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{totalHours}</span>
            </div>
          )}
          {entryCount !== undefined && (
            <div className="flex items-center gap-1.5 text-sm">
              <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">{entryCount} entries</span>
            </div>
          )}
        </div>
      </div>

      {/* Entry List */}
      <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No entries yet today</p>
            <p className="text-xs text-muted-foreground mt-1">Start a timer to track your work</p>
          </div>
        )}
      </div>
    </div>
  )
}
