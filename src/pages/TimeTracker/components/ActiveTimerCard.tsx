import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

type ActiveTimerCardProps = {
  duration: string
  projects: string[]
  task: string
  isPaused: boolean
  onStop: () => void
  onQuickAddTask?: (task: string) => void
}

export function ActiveTimerCard({ duration, projects, task, isPaused, onStop, onQuickAddTask }: ActiveTimerCardProps) {
  const [quickTask, setQuickTask] = useState('')

  const handleQuickAdd = () => {
    if (quickTask.trim() && onQuickAddTask) {
      onQuickAddTask(quickTask.trim())
      setQuickTask('')
    }
  }

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
                className="flex-1"
              />
              <Button
                onClick={handleQuickAdd}
                disabled={!quickTask.trim()}
                size="default"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Task will use current project{projects.length > 1 ? 's' : ''}: {projects.join(', ')}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

