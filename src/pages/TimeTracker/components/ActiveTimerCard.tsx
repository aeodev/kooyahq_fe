import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ActiveTimerCardProps = {
  duration: string
  projects: string[]
  task: string
  isPaused: boolean
  onStop: () => void
}

export function ActiveTimerCard({ duration, projects, task, isPaused, onStop }: ActiveTimerCardProps) {
  return (
    <Card className="border-primary/50 bg-primary/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'} ${isPaused ? '' : 'animate-pulse'}`}></span>
              {isPaused ? 'Paused Timer' : 'Active Timer'}
            </CardTitle>
            <p className="text-2xl font-bold mt-2 text-primary">{duration}</p>
          </div>
          <Button variant="destructive" onClick={onStop} size="lg">
            Stop
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Projects</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {projects.map((project) => (
                <Badge key={project} variant="secondary">
                  {project}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Task</p>
            <p className="text-sm font-medium mt-1">{task}</p>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

