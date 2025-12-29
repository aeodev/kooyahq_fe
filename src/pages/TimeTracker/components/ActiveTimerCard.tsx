import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Square, Pause, Play, FolderPlus, Coffee, Clock, LogOut } from 'lucide-react'
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
    <Card className="border-primary/50 bg-primary/5 backdrop-blur-sm h-full">
      <CardContent className="p-6 space-y-6">
        {/* Header: Status + Duration + Stop */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className={`absolute h-3 w-3 rounded-full ${isPaused ? 'bg-yellow-500/40' : 'bg-red-500/40'} ${isPaused ? '' : 'animate-ping'}`} />
                <span className={`relative h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`} />
              </div>
              <span className={`text-sm font-medium tracking-wide ${isPaused ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPaused ? 'PAUSED' : 'TRACKING'}
              </span>
            </div>
            <p className="text-4xl font-bold text-primary tracking-tight tabular-nums">{duration}</p>
          </div>
          
          {/* Stop Button */}
          <Button 
            variant="destructive" 
            onClick={onStop} 
            size="sm"
            disabled={controlsDisabled}
            className="h-10 px-5 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 gap-2"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop Timer
          </Button>
        </div>

        {/* HERO: Current Task - The star of the show */}
        <div className="relative p-4 -mx-1 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Coffee className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold mb-1">
                Current Focus
              </p>
              <p className="text-lg font-medium text-foreground leading-snug line-clamp-2">
                {latestTask || <span className="text-muted-foreground italic">No task description</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Project Selector - Cleaner pills with obvious active state */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
              {hasMultipleProjects ? 'Active Project' : 'Project'}
            </p>
            {hasMultipleProjects && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {selectedProjects.indexOf(activeProject) + 1} of {selectedProjects.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {selectedProjects.map((project) => {
              const isActive = project === activeProject
              return (
                <button
                  key={project}
                  onClick={() => {
                    if (!isActive && !controlsDisabled) {
                      onSwitchProject(project)
                    }
                  }}
                  disabled={controlsDisabled}
                  className={`
                    relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/50' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                    }
                    ${!isActive && !controlsDisabled ? 'cursor-pointer' : ''}
                    ${controlsDisabled ? 'opacity-50' : ''}
                  `}
                >
                  {isActive && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground border-2 border-primary" />
                    </span>
                  )}
                  {project}
                </button>
              )
            })}
            
            {/* Add Projects Dropdown */}
            {availableToAdd.length > 0 && onAddProject && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent" 
                    disabled={controlsDisabled}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FolderPlus className="h-3 w-3" />
                    Add to session
                  </DropdownMenuLabel>
                  {availableToAdd.map((project) => (
                    <DropdownMenuItem
                      key={project}
                      onClick={() => onAddProject(project)}
                      className="cursor-pointer text-sm"
                    >
                      {project}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Quick Add Task */}
        {onQuickAddTask && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Quick Add Task</p>
            <div className="flex gap-2">
              <Input
                placeholder="What are you working on now?"
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickTask.trim()) {
                    handleQuickAdd()
                  }
                }}
                disabled={controlsDisabled}
                className="flex-1 h-10 text-sm"
              />
              <Button
                onClick={handleQuickAdd}
                disabled={!quickTask.trim() || controlsDisabled}
                size="sm"
                className="h-10 px-4"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons - Visually differentiated */}
        <div className="flex gap-3 pt-2">
          {/* Pause/Resume - Primary action style */}
          {isPaused ? (
            onResume && (
              <Button
                variant="outline"
                onClick={onResume}
                disabled={controlsDisabled}
                className="flex-1 h-11 text-sm font-semibold gap-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
              >
                <Play className="h-4 w-4 fill-current" />
                Resume
              </Button>
            )
          ) : (
            onPause && (
              <Button
                variant="outline"
                onClick={onPause}
                disabled={controlsDisabled}
                className="flex-1 h-11 text-sm font-semibold gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )
          )}
          
          {/* Add Manual - Secondary/neutral style */}
          {onAdd && (
            <Button
              variant="outline"
              onClick={onAdd}
              disabled={controlsDisabled || disableAdd}
              className="flex-1 h-11 text-sm font-semibold gap-2"
            >
              <Clock className="h-4 w-4" />
              Add Manual
            </Button>
          )}
          
          {/* End Day - Destructive/final action with distinct styling */}
          {showEndDay && onEndDay && (
            <Button
              variant="outline"
              onClick={onEndDay}
              disabled={controlsDisabled || disableEndDay}
              className="h-11 px-4 text-sm font-semibold gap-2 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50"
            >
              <LogOut className="h-4 w-4" />
              End Day
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
