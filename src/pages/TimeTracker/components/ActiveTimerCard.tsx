import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, ChevronDown, Square, Pause, Play, FolderPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  const otherProjects = selectedProjects.filter(p => p !== activeProject)
  const availableToAdd = allProjects.filter(p => !selectedProjects.includes(p))

  // Get the latest task text
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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className={`h-2 w-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'} ${isPaused ? '' : 'animate-pulse'}`}></span>
              {isPaused ? 'Paused' : 'Active'}
            </CardTitle>
            <p className="text-3xl font-bold text-primary tracking-tight">{duration}</p>
          </div>
          <Button 
            variant="destructive" 
            onClick={onStop} 
            size="sm"
            disabled={controlsDisabled}
            className="h-9 px-4 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {hasMultipleProjects ? 'Projects' : 'Project'}
            </p>
            {hasMultipleProjects && (
              <span className="text-xs text-muted-foreground">
                {selectedProjects.indexOf(activeProject) + 1}/{selectedProjects.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
              {activeProject}
            </Badge>
            {otherProjects.length > 0 && (
              <span className="text-xs text-muted-foreground">
                +{otherProjects.length} more
              </span>
            )}
            
            {/* Switch & Add Projects Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={controlsDisabled}>
                  {hasMultipleProjects ? 'Manage' : 'Add'} <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                {/* Switch to other selected projects */}
                {otherProjects.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch to</DropdownMenuLabel>
                    {otherProjects.map((project) => (
                      <DropdownMenuItem
                        key={project}
                        onClick={() => onSwitchProject(project)}
                        className="cursor-pointer text-sm"
                      >
                        {project}
                      </DropdownMenuItem>
                    ))}
                    {availableToAdd.length > 0 && <DropdownMenuSeparator />}
                  </>
                )}
                
                {/* Add new projects */}
                {availableToAdd.length > 0 && onAddProject && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
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
                  </>
                )}
                
                {availableToAdd.length === 0 && otherProjects.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No other projects available
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Current Task */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Current Task</p>
          <p className="text-sm font-normal text-foreground leading-5 line-clamp-2">{latestTask || 'No task'}</p>
        </div>

        {/* Quick Add Task */}
        {onQuickAddTask && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add Task</p>
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
                className="flex-1 h-9 text-sm"
              />
              <Button
                onClick={handleQuickAdd}
                disabled={!quickTask.trim() || controlsDisabled}
                size="sm"
                className="h-9 px-3"
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
                className="flex-1 h-9 text-sm font-medium gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Resume
              </Button>
            )
          ) : (
            onPause && (
              <Button
                variant="outline"
                onClick={onPause}
                disabled={controlsDisabled}
                className="flex-1 h-9 text-sm font-medium gap-1.5"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            )
          )}
          {onAdd && (
            <Button
              variant="outline"
              onClick={onAdd}
              disabled={controlsDisabled || disableAdd}
              className="flex-1 h-9 text-sm font-medium"
            >
              Add Manual
            </Button>
          )}
          {showEndDay && onEndDay && (
            <Button
              variant="outline"
              onClick={onEndDay}
              disabled={controlsDisabled || disableEndDay}
              className="flex-1 h-9 text-sm font-medium"
            >
              End Day
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
