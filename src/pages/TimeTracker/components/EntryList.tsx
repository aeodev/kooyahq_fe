import { useState } from 'react'
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
  isPaused?: boolean
}

type EntryListProps = {
  entries: DisplayEntry[]
  totalHours?: string
  entryCount?: number
}

function LiveTotalDuration({ entry, className }: { entry: DisplayEntry; className?: string }) {
  return <span className={className}>{entry.duration}</span>
}

function EntryRow({ entry }: { entry: DisplayEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasMultipleTasks = entry.tasks.length > 1
  const mainTask = entry.tasks.length > 0 ? entry.tasks[entry.tasks.length - 1].text : 'No task'

  return (
    <div className="group">
      <div 
        className={`
          flex items-center gap-4 px-4 py-4 
          transition-all duration-200 cursor-pointer
          hover:bg-accent/50
          ${entry.isPaused ? 'bg-yellow-500/5' : entry.isActive ? 'bg-emerald-500/5' : ''}
          ${hasMultipleTasks ? 'cursor-pointer' : ''}
        `}
        onClick={() => hasMultipleTasks && setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {entry.isPaused ? (
            <span className="flex h-3 w-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
          ) : entry.isActive ? (
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/50 transition-colors" />
          )}
        </div>

        {/* Project & Task */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{entry.project}</span>
            {entry.isOvertime && (
              <Badge className="text-xs py-0 px-2 bg-amber-500/10 text-amber-600 border-0">
                OT
              </Badge>
            )}
            {entry.isPaused && (
              <Badge className="text-xs py-0 px-2 bg-yellow-500/10 text-yellow-600 border-0">
                Paused
              </Badge>
            )}
            {entry.isActive && !entry.isPaused && (
              <Badge className="text-xs py-0 px-2 bg-emerald-500/10 text-emerald-600 border-0">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{mainTask}</p>
        </div>

        {/* Time range */}
        <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block tabular-nums">
          {entry.time}
        </div>

        {/* Duration */}
        <div className="text-right flex-shrink-0 min-w-[64px]">
          <LiveTotalDuration 
            entry={entry} 
            className={`text-sm font-semibold tabular-nums ${entry.isPaused ? 'text-yellow-600' : entry.isActive ? 'text-emerald-600' : 'text-foreground'}`} 
          />
        </div>

        {/* Expand indicator */}
        {hasMultipleTasks && (
          <div className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>

      {/* Expanded tasks */}
      {expanded && hasMultipleTasks && (
        <div className="ml-12 mr-4 mb-4 pl-4 border-l-2 border-border/50 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {entry.tasks.map((task, index) => (
            <div key={index} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground truncate">{task.text}</span>
              <span className="text-muted-foreground tabular-nums ml-4">
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
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header with Summary */}
      <div className="flex items-center justify-between px-4 py-4 bg-muted/20 border-b border-border/50">
        <h3 className="text-base font-semibold text-foreground">Today's Activity</h3>
        <div className="flex items-center gap-6">
          {totalHours && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground tabular-nums">{totalHours}</span>
            </div>
          )}
          {entryCount !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{entryCount} entries</span>
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
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No entries yet today</p>
            <p className="text-xs text-muted-foreground mt-1">Start a timer to track your work</p>
          </div>
        )}
      </div>
    </div>
  )
}
