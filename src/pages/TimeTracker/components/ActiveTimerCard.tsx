import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Square, Pause, Play, FolderPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { TaskItem } from '@/types/time-entry'

type ActiveTimerCardProps = {
  duration: string
  projects: string[]
  tasks: TaskItem[]
  isPaused: boolean
  onStop: () => void
  onPause?: () => void
  onResume?: () => void
  onQuickAddTask?: (task: string) => void
  selectedProjects: string[]
  activeProject: string
  onSwitchProject: (project: string) => void
  controlsDisabled?: boolean
  onAdd?: () => void
  onEndDay?: () => void
  showEndDay?: boolean
  disableAdd?: boolean
  disableEndDay?: boolean
  allProjects?: string[]
  onAddProject?: (project: string) => void
}

export function ActiveTimerCard({ 
  duration, 
  tasks, 
  isPaused, 
  onStop,
  onPause,
  onResume,
  onQuickAddTask,
  selectedProjects,
  activeProject,
  onSwitchProject,
  controlsDisabled = false,
  onAdd,
  onEndDay,
  showEndDay = true,
  disableAdd = false,
  disableEndDay = false,
  allProjects = [],
  onAddProject,
}: ActiveTimerCardProps) {
  const [quickTask, setQuickTask] = useState('')
  const hasMultipleProjects = selectedProjects.length > 1
  const availableToAdd = allProjects.filter(p => !selectedProjects.includes(p))

  const latestTask = tasks.length > 0 ? tasks[tasks.length - 1].text : ''

  const handleQuickAdd = () => {
    if (controlsDisabled) return
    if (quickTask.trim() && onQuickAddTask) {
      onQuickAddTask(quickTask.trim())
      setQuickTask('')
    }
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 h-full">
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent blur-3xl transition-opacity duration-1000 ${isPaused ? 'opacity-30' : 'opacity-60'}`} />
      
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'} ${isPaused ? '' : 'animate-pulse shadow-lg shadow-emerald-500/50'}`} />
              <span className="text-sm font-medium text-muted-foreground">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
            
            {/* Hero Timer Display */}
            <div className="space-y-1">
              <p className={`text-5xl font-bold tracking-tight tabular-nums transition-colors duration-300 ${isPaused ? 'text-muted-foreground' : 'text-foreground'}`}>
                {duration}
              </p>
              <p className="text-xs text-muted-foreground">elapsed time</p>
            </div>
          </div>
          
          {/* Stop Button */}
          <Button 
            variant="destructive" 
            onClick={onStop} 
            size="sm"
            disabled={controlsDisabled}
            className="h-10 px-4 text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-6">
        {/* Project Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {hasMultipleProjects ? 'Projects' : 'Project'} {hasMultipleProjects && `(${selectedProjects.length})`}
            </p>
            {hasMultipleProjects && (
              <span className="text-xs text-muted-foreground">
                Click to switch
              </span>
            )}
          </div>
          
          {/* All Projects - Visible & Clickable */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedProjects.map((project) => {
              const isActive = project === activeProject
              return (
                <button
                  key={project}
                  onClick={() => !isActive && !controlsDisabled && onSwitchProject(project)}
                  disabled={controlsDisabled}
                  className={`
                    text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-500/30 shadow-sm' 
                      : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground cursor-pointer'
                    }
                    ${controlsDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />}
                  {project}
                </button>
              )
            })}
            
            {/* Add Project Dropdown */}
            {availableToAdd.length > 0 && onAddProject && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 gap-1" 
                    disabled={controlsDisabled}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Add</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                    <FolderPlus className="h-3 w-3" />
                    Add Project
                  </DropdownMenuLabel>
                  {availableToAdd.map((project) => (
                    <DropdownMenuItem
                      key={project}
                      onClick={() => onAddProject(project)}
                      className="cursor-pointer text-sm"
                    >
                      <Plus className="h-3 w-3 mr-2 text-muted-foreground" />
                      {project}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Current Task */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Current Task</p>
          <p className="text-base font-medium text-foreground leading-relaxed">{latestTask || 'No task'}</p>
        </div>

        {/* Quick Add Task */}
        {onQuickAddTask && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Add Task</p>
            <div className="flex gap-2">
              <Input
                placeholder="What are you working on?"
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickTask.trim()) {
                    handleQuickAdd()
                  }
                }}
                disabled={controlsDisabled}
                className="flex-1 h-10 text-sm bg-background/50 border-border/50 focus:bg-background transition-colors"
              />
              <Button
                onClick={handleQuickAdd}
                disabled={!quickTask.trim() || controlsDisabled}
                size="sm"
                className="h-10 px-4 hover:scale-105 transition-transform"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isPaused ? (
            onResume && (
              <Button
                variant="outline"
                onClick={onResume}
                disabled={controlsDisabled}
                className="flex-1 h-10 text-sm font-medium gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 hover:scale-[1.02] transition-all"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )
          ) : (
            onPause && (
              <Button
                variant="outline"
                onClick={onPause}
                disabled={controlsDisabled}
                className="flex-1 h-10 text-sm font-medium gap-2 bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 hover:scale-[1.02] transition-all"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )
          )}
          {onAdd && (
            <Button
              variant="outline"
              onClick={onAdd}
              disabled={controlsDisabled || disableAdd}
              className="flex-1 h-10 text-sm font-medium hover:scale-[1.02] transition-all"
            >
              Add Manual
            </Button>
          )}
          {showEndDay && onEndDay && (
            <Button
              variant="outline"
              onClick={onEndDay}
              disabled={controlsDisabled || disableEndDay}
              className="flex-1 h-10 text-sm font-medium hover:scale-[1.02] transition-all"
            >
              End Day
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
