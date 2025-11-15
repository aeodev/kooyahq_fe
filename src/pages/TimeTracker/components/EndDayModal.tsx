import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TimeEntry } from '@/types/time-entry'

type EndDayModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  entries: TimeEntry[]
  loading?: boolean
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return ''
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function EndDayModal({ open, onClose, onSubmit, entries, loading }: EndDayModalProps) {
  if (!open) return null

  const regularEntries = entries.filter((entry) => !entry.isOvertime)
  const overtimeEntries = entries.filter((entry) => entry.isOvertime)

  const totalMinutes = entries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      return sum + Math.floor(diffMs / 60000)
    }
    return sum + entry.duration
  }, 0)

  const regularMinutes = regularEntries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      return sum + Math.floor(diffMs / 60000)
    }
    return sum + entry.duration
  }, 0)

  const overtimeMinutes = overtimeEntries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      return sum + Math.floor(diffMs / 60000)
    }
    return sum + entry.duration
  }, 0)

  const totalDuration = formatDuration(totalMinutes)
  const regularDuration = formatDuration(regularMinutes)
  const overtimeDuration = formatDuration(overtimeMinutes)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-2xl m-4 bg-background/95 backdrop-blur-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>End of Day Summary</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {overtimeEntries.length > 0 
              ? 'Day completed with overtime work'
              : 'Review your entries for today before ending the day'}
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          <div className="border border-border/50 rounded-lg p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Time Today</span>
              <span className="text-lg font-semibold text-primary">{totalDuration}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium">Total Entries</span>
              <span className="text-lg font-semibold">{entries.length}</span>
            </div>
            {overtimeEntries.length > 0 && (
              <>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className="text-sm font-medium">Regular Time</span>
                  <span className="text-lg font-semibold">{regularDuration}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-orange-600">Overtime Work</span>
                  <span className="text-lg font-semibold text-orange-600">{overtimeDuration}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            {regularEntries.length > 0 && (
              <>
                <h3 className="text-sm font-semibold">Regular Entries</h3>
                {regularEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="border border-border/60 rounded-lg p-3 bg-background/50">
                          <ul className="list-disc list-inside space-y-1">
                            {entry.task.split(',').map((task, index) => (
                              <li key={index} className="text-sm font-medium text-foreground">
                                {task.trim()}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-sm text-muted-foreground">{entry.projects.join(', ')}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatTimeRange(entry.startTime, entry.endTime)}</p>
                      </div>
                      <p className="text-lg font-semibold text-foreground whitespace-nowrap">
                        {formatDuration(entry.isActive && entry.startTime ? 
                          Math.floor((new Date().getTime() - new Date(entry.startTime).getTime()) / 60000) : 
                          entry.duration)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {overtimeEntries.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-orange-600">Overtime Work</h3>
                {overtimeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="border border-border/60 rounded-lg p-3 bg-background/50">
                        <ul className="list-disc list-inside space-y-1">
                          {entry.task.split(',').map((task, index) => (
                            <li key={index} className="text-sm font-medium text-foreground">
                              {task.trim()}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-muted-foreground">{entry.projects.join(', ')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatTimeRange(entry.startTime, entry.endTime)}</p>
                    </div>
                    <p className="text-lg font-semibold text-foreground whitespace-nowrap">
                      {formatDuration(entry.isActive && entry.startTime ? 
                        Math.floor((new Date().getTime() - new Date(entry.startTime).getTime()) / 60000) : 
                        entry.duration)}
                    </p>
                  </div>
                </div>
                ))}
              </>
            )}
            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No entries for today</p>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            {overtimeEntries.length > 0 ? (
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
                disabled={loading}
              >
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Ending Day...' : 'End Day'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

