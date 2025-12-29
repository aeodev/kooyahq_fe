import { Play, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProjectSelector } from '@/components/ui/project-selector'
import { Badge } from '@/components/ui/badge'

type StartTimerFormProps = {
  projects: string[]
  selectedProjects: string[]
  taskDescription: string
  onSelectionChange: (projects: string[]) => void
  onTaskChange: (task: string) => void
  onStart: () => void
  projectTasks: Record<string, string>
  onSetProjectTask: (project: string, task: string) => void
  activeProject: string | null
  disabled?: boolean
  onAdd?: () => void
  onEndDay?: () => void
  showEndDay?: boolean
  disableAdd?: boolean
  disableEndDay?: boolean
}

export function StartTimerForm({
  projects,
  selectedProjects,
  taskDescription,
  onSelectionChange,
  onTaskChange,
  onStart,
  projectTasks,
  onSetProjectTask,
  activeProject,
  disabled = false,
  onAdd,
  onEndDay,
  showEndDay = true,
  disableAdd = false,
  disableEndDay = false,
}: StartTimerFormProps) {
  const firstProject = selectedProjects[0]
  const firstProjectTask = firstProject ? projectTasks[firstProject] || taskDescription : taskDescription
  const canStart = !disabled && selectedProjects.length > 0 && firstProjectTask.trim().length > 0

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              Start Timer
            </h2>
            {selectedProjects.length > 1 && activeProject && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Starting with: <span className="font-medium text-primary">{activeProject}</span>
              </p>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-2.5">
          <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold block">
            Select Projects
          </label>
          <ProjectSelector
            projects={projects}
            selectedProjects={selectedProjects}
            onSelectionChange={onSelectionChange}
            placeholder="Select projects..."
            showRecentFirst={true}
            className={disabled ? 'pointer-events-none opacity-60' : undefined}
          />
        </div>

        {/* Task Description Section */}
        {selectedProjects.length === 0 ? (
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold block">
              Task Description
            </label>
            <Input
              placeholder="What are you working on?"
              value={taskDescription}
              onChange={(e) => onTaskChange(e.target.value)}
              className="h-11 text-sm"
              disabled={disabled}
            />
          </div>
        ) : selectedProjects.length === 1 ? (
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold block">
              Task Description <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="What are you working on?"
              value={firstProjectTask}
              onChange={(e) => {
                const task = e.target.value
                onSetProjectTask(selectedProjects[0], task)
                onTaskChange(task)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canStart) {
                  onStart()
                }
              }}
              className="h-11 text-sm"
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold block">
              Task for Each Project
            </label>
            {selectedProjects.map((project, index) => {
              const isFirst = index === 0
              const task = projectTasks[project] || ''
              return (
                <div key={project} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-foreground">
                      {project}
                      {isFirst && <span className="text-destructive ml-1">*</span>}
                      {isFirst && activeProject === project && (
                        <Badge variant="secondary" className="ml-2 text-[9px] py-0 px-1.5">Active</Badge>
                      )}
                    </label>
                  </div>
                  <Input
                    placeholder={isFirst ? "Required" : "Optional"}
                    value={task}
                    onChange={(e) => onSetProjectTask(project, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canStart) {
                        onStart()
                      }
                    }}
                    className="h-10 text-sm"
                    disabled={disabled}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 pt-2">
          {/* Primary Start Button */}
          <Button
            onClick={onStart}
            disabled={!canStart}
            className="w-full h-12 text-sm font-semibold tracking-tight shadow-md hover:shadow-lg transition-all duration-200 gap-2"
            size="lg"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Timer
          </Button>
          
          {/* Quick Actions - Differentiated */}
          <div className="flex gap-3">
            {onAdd && (
              <Button
                variant="outline"
                onClick={onAdd}
                disabled={disabled || disableAdd}
                className="flex-1 h-10 text-sm font-medium gap-2"
              >
                <Clock className="h-4 w-4" />
                Add Manual
              </Button>
            )}
            {showEndDay && onEndDay && (
              <Button
                variant="outline"
                onClick={onEndDay}
                disabled={disabled || disableEndDay}
                className="h-10 px-4 text-sm font-medium gap-2 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50"
              >
                <LogOut className="h-4 w-4" />
                End Day
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
