import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type StartTimerFormProps = {
  projects: string[]
  selectedProjects: string[]
  taskDescription: string
  onToggleProject: (project: string) => void
  onTaskChange: (task: string) => void
  onStart: () => void
}

export function StartTimerForm({
  projects,
  selectedProjects,
  taskDescription,
  onToggleProject,
  onTaskChange,
  onStart,
}: StartTimerFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Timer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Projects</label>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Button
                key={project}
                variant={selectedProjects.includes(project) ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleProject(project)}
                className="h-9"
              >
                {project}
              </Button>
            ))}
          </div>
          {selectedProjects.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Task Description</label>
          <Input
            placeholder="What are you working on?"
            value={taskDescription}
            onChange={(e) => onTaskChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedProjects.length > 0 && taskDescription.trim()) {
                onStart()
              }
            }}
            className="h-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onStart}
            disabled={selectedProjects.length === 0 || !taskDescription.trim()}
            className="flex-1"
            size="lg"
          >
            Start Timer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}



