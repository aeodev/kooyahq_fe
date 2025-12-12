import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TaskItem } from '@/types/time-entry'

type ActiveTimerCardProps = {
  duration: string
  projects: string[]
  tasks: TaskItem[]
  isPaused: boolean
  onStop: () => void
  onQuickAddTask?: (task: string) => void
  selectedProjects: string[]
  activeProject: string
  onSwitchProject: (project: string) => void
  controlsDisabled?: boolean
}

export function ActiveTimerCard({ 
  duration, 
  tasks, 
  isPaused, 
  onStop, 
  onQuickAddTask,
  selectedProjects,
  activeProject,
  onSwitchProject,
  controlsDisabled = false,
}: ActiveTimerCardProps) {
  const [quickTask, setQuickTask] = useState('')
  const hasMultipleProjects = selectedProjects.length > 1
  const otherProjects = selectedProjects.filter(p => p !== activeProject)

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
    <Card className="border-primary/50 bg-primary/5 backdrop-blur-sm">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <CardTitle className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
              <span className={`h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'} ${isPaused ? '' : 'animate-pulse'}`}></span>
              {isPaused ? 'Paused Timer' : 'Active Timer'}
            </CardTitle>
            <p className="text-3xl font-bold text-primary tracking-tight">{duration}</p>
          </div>
          <Button 
            variant="destructive" 
            onClick={onStop} 
            size="lg"
            disabled={controlsDisabled}
            className="h-11 px-6 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Stop
          </Button>
        </div>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground leading-5">Project</p>
              {hasMultipleProjects && (
                <span className="text-xs text-muted-foreground">
                  {selectedProjects.indexOf(activeProject) + 1} of {selectedProjects.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                {activeProject}
              </Badge>
              {hasMultipleProjects && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={controlsDisabled}>
                      Switch <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {otherProjects.map((project) => (
                      <DropdownMenuItem
                        key={project}
                        onClick={() => onSwitchProject(project)}
                        className="cursor-pointer"
                      >
                        {project}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground leading-5">Current Task</p>
            <p className="text-sm font-normal text-foreground leading-5">{latestTask || 'No task'}</p>
          </div>
        </div>
      </CardHeader>
      {onQuickAddTask && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Add Task:</span>
            </div>
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
                className="flex-1"
              />
              <Button
                onClick={handleQuickAdd}
                disabled={!quickTask.trim() || controlsDisabled}
                size="default"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Task will update for current project: {activeProject}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
