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
}: StartTimerFormProps) {
  const firstProject = selectedProjects[0]
  const firstProjectTask = firstProject ? projectTasks.get(firstProject) || taskDescription : taskDescription
  const canStart = selectedProjects.length > 0 && firstProjectTask.trim().length > 0

  return (
    <Card className="border-border/60 min-h-[400px]">
      <CardHeader className="pb-5">
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
          Start Timer
        </CardTitle>
        {selectedProjects.length > 1 && activeProject && (
          <p className="text-sm text-muted-foreground mt-2">
            Active project: <span className="font-medium text-foreground">{activeProject}</span> (will start first)
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Projects Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
            Select Projects
          </label>
          <ProjectSelector
            projects={projects}
            selectedProjects={selectedProjects}
            onSelectionChange={onSelectionChange}
            placeholder="Select projects..."
            showRecentFirst={true}
          />
        </div>

        {/* Task Description Section */}
        {selectedProjects.length === 0 ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
              Task Description
            </label>
            <Input
              placeholder="What are you working on?"
              value={taskDescription}
              onChange={(e) => onTaskChange(e.target.value)}
              className="h-12 text-base font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
        ) : selectedProjects.length === 1 ? (
          <div className="space-y-3">
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
              className="h-12 text-base font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
              Task Description for Each Project
            </label>
            {selectedProjects.map((project, index) => {
              const isFirst = index === 0
              const task = projectTasks.get(project) || ''
              return (
                <div key={project} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {project}
                      {isFirst && <span className="text-red-500 ml-1">*</span>}
                      {isFirst && activeProject === project && (
                        <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                      )}
                    </label>
                  </div>
                  <Input
                    placeholder={isFirst ? "What are you working on? (required)" : "Task for this project (optional)"}
                    value={task}
                    onChange={(e) => onSetProjectTask(project, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canStart) {
                        onStart()
                      }
                    }}
                    className="h-12 text-base font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Start Button */}
        <div className="pt-2">
          <Button
            onClick={onStart}
            disabled={!canStart}
            className="w-full h-12 text-base font-semibold tracking-tight shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            Start Timer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}



