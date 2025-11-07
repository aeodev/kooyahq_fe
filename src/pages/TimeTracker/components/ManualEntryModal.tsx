import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ManualEntryModalProps = {
  projects: string[]
  open: boolean
  onClose: () => void
  onSubmit: (data: { projects: string[]; task: string; hours: number; minutes: number }) => void
  loading?: boolean
}

export function ManualEntryModal({ projects, open, onClose, onSubmit, loading }: ManualEntryModalProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [task, setTask] = useState('')
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')

  if (!open) return null

  const toggleProject = (project: string) => {
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project]
    )
  }

  const handleSubmit = () => {
    if (selectedProjects.length === 0 || !task.trim()) {
      return
    }

    const hoursNum = parseInt(hours) || 0
    const minutesNum = parseInt(minutes) || 0

    if (hoursNum === 0 && minutesNum === 0) {
      return
    }

    onSubmit({
      projects: selectedProjects,
      task: task.trim(),
      hours: hoursNum,
      minutes: minutesNum,
    })

    // Reset form
    setSelectedProjects([])
    setTask('')
    setHours('0')
    setMinutes('0')
  }

  const handleClose = () => {
    setSelectedProjects([])
    setTask('')
    setHours('0')
    setMinutes('0')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <Card className="w-full max-w-md m-4 bg-background/95 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Add Time Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Projects</label>
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <Button
                  key={project}
                  type="button"
                  variant={selectedProjects.includes(project) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleProject(project)}
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
              placeholder="What did you work on?"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Time Spent</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Hours"
                  value={hours}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
                      setHours(val)
                    }
                  }}
                  className="h-10"
                />
              </div>
              <span className="text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Minutes"
                  value={minutes}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                      setMinutes(val)
                    }
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedProjects.length === 0 || !task.trim() || loading || (parseInt(hours) === 0 && parseInt(minutes) === 0)}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



