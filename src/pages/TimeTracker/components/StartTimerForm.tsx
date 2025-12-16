import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  projectTasks: Map<string, string>
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
  const firstProjectTask = firstProject ? projectTasks.get(firstProject) || taskDescription : taskDescription
  const canStart = !disabled && selectedProjects.length > 0 && firstProjectTask.trim().length > 0

  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
          Start Timer
        </CardTitle>
        {selectedProjects.length > 1 && activeProject && (
          <p className="text-sm text-muted-foreground mt-1">
            Active: <span className="font-medium text-foreground">{activeProject}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Projects Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
              Task Description
            </label>
            <Input
              placeholder="What are you working on?"
              value={taskDescription}
              onChange={(e) => onTaskChange(e.target.value)}
              className="h-11 text-sm font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              disabled={disabled}
            />
          </div>
        ) : selectedProjects.length === 1 ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
              Task Description <span className="text-red-500">*</span>
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
              className="h-11 text-sm font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
              Task for Each Project
            </label>
            {selectedProjects.map((project, index) => {
              const isFirst = index === 0
              const task = projectTasks.get(project) || ''
              return (
                <div key={project} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {project}
                      {isFirst && <span className="text-red-500 ml-1">*</span>}
                      {isFirst && activeProject === project && (
                        <Badge variant="secondary" className="ml-2 text-xs py-0">Active</Badge>
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
                    className="h-10 text-sm font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    disabled={disabled}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={onStart}
            disabled={!canStart}
            className="w-full h-11 text-sm font-semibold tracking-tight shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            size="lg"
          >
            <Play className="h-4 w-4" />
            Start Timer
          </Button>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            {onAdd && (
              <Button
                variant="outline"
                onClick={onAdd}
                disabled={disabled || disableAdd}
                className="flex-1 h-10 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
              >
                Add Manual
              </Button>
            )}
            {showEndDay && onEndDay && (
              <Button
                variant="outline"
                onClick={onEndDay}
                disabled={disabled || disableEndDay}
                className="flex-1 h-10 text-sm font-medium border-border/60 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
              >
                End Day
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


