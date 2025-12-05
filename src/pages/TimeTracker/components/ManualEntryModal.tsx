import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

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

  const toggleProject = (project: string) => {
    setSelectedProjects((prev) =>
      prev.includes(project) ? prev.filter((p) => p !== project) : [...prev, project]
    )
  }

  const handleSubmit = () => {
    if (selectedProjects.length === 0 || !task.trim()) return

    const hoursNum = parseInt(hours) || 0
    const minutesNum = parseInt(minutes) || 0

    if (hoursNum === 0 && minutesNum === 0) return

    onSubmit({
      projects: selectedProjects,
      task: task.trim(),
      hours: hoursNum,
      minutes: minutesNum,
    })

    resetForm()
  }

  const resetForm = () => {
    setSelectedProjects([])
    setTask('')
    setHours('0')
    setMinutes('0')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProjects.length === 0 || !task.trim() || loading || (parseInt(hours) === 0 && parseInt(minutes) === 0)}
          >
            {loading ? 'Adding...' : 'Add Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
