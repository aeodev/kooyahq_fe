import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProjectSelector } from '@/components/ui/project-selector'

type StartTimerFormProps = {
  projects: string[]
  selectedProjects: string[]
  taskDescription: string
  onSelectionChange: (projects: string[]) => void
  onTaskChange: (task: string) => void
  onStart: () => void
}

export function StartTimerForm({
  projects,
  selectedProjects,
  taskDescription,
  onSelectionChange,
  onTaskChange,
  onStart,
}: StartTimerFormProps) {
  return (
    <Card className="border-border/60 min-h-[400px]">
      <CardHeader className="pb-5">
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
          Start Timer
        </CardTitle>
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
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground leading-5 tracking-tight block">
            Task Description
          </label>
          <Input
            placeholder="What are you working on?"
            value={taskDescription}
            onChange={(e) => onTaskChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedProjects.length > 0 && taskDescription.trim()) {
                onStart()
              }
            }}
            className="h-12 text-base font-normal border-border/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <Button
            onClick={onStart}
            disabled={selectedProjects.length === 0 || !taskDescription.trim()}
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



