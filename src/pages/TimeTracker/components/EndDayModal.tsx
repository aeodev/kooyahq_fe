import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { TimeEntry, WorkspaceSummaryTicket } from '@/types/time-entry'
import { formatDuration, formatTimeRange } from './utils'

type EndDayModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  entries: TimeEntry[]
  workspaceTickets?: WorkspaceSummaryTicket[]
  workspaceLoading?: boolean
  loading?: boolean
}

export function EndDayModal({ open, onClose, onSubmit, entries, workspaceTickets = [], workspaceLoading = false, loading }: EndDayModalProps) {
  const regularEntries = entries.filter((entry) => !entry.isOvertime)
  const overtimeEntries = entries.filter((entry) => entry.isOvertime)

  const calculateMinutes = (entryList: TimeEntry[]) =>
    entryList.reduce((sum, entry) => {
      if (entry.isActive && entry.startTime) {
        const start = new Date(entry.startTime)
        const now = new Date()
        return sum + Math.floor((now.getTime() - start.getTime()) / 60000)
      }
      return sum + entry.duration
    }, 0)

  const totalMinutes = calculateMinutes(entries)
  const regularMinutes = calculateMinutes(regularEntries)
  const overtimeMinutes = calculateMinutes(overtimeEntries)

  const renderEntry = (entry: TimeEntry) => {
    const tasks = entry.tasks || []
    
    return (
      <div
        key={entry.id}
        className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="border border-border/60 rounded-lg p-3 bg-background/50">
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {task.text}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDuration(task.duration)}
                    </span>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tasks</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{entry.projects.join(', ')}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatTimeRange(entry.startTime, entry.endTime)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground whitespace-nowrap">
              {formatDuration(entry.isActive && entry.startTime
                ? Math.floor((new Date().getTime() - new Date(entry.startTime).getTime()) / 60000)
                : entry.duration)}
            </p>
            <p className="text-xs text-muted-foreground">total</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>End of Day Summary</DialogTitle>
          <DialogDescription>
            {overtimeEntries.length > 0
              ? 'Day completed with overtime work'
              : 'Review your entries for today before ending the day'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="border border-border/50 rounded-lg p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Time Today</span>
              <span className="text-lg font-semibold text-primary">{formatDuration(totalMinutes)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium">Total Entries</span>
              <span className="text-lg font-semibold">{entries.length}</span>
            </div>
            {overtimeEntries.length > 0 && (
              <>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className="text-sm font-medium">Regular Time</span>
                  <span className="text-lg font-semibold">{formatDuration(regularMinutes)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-orange-600">Overtime Work</span>
                  <span className="text-lg font-semibold text-orange-600">{formatDuration(overtimeMinutes)}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            {regularEntries.length > 0 && (
              <>
                <h3 className="text-sm font-semibold">Regular Entries</h3>
                {regularEntries.map(renderEntry)}
              </>
            )}
            {overtimeEntries.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-orange-600">Overtime Work</h3>
                {overtimeEntries.map(renderEntry)}
              </>
            )}
            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No entries for today</p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <h3 className="text-sm font-semibold">Workspace Summary</h3>
              <p className="text-xs text-muted-foreground">
                Tickets assigned during your tracked time or currently assigned
              </p>
            </div>
            {workspaceLoading ? (
              <p className="text-sm text-muted-foreground">Loading workspace summary...</p>
            ) : workspaceTickets.length > 0 ? (
              <div className="space-y-2">
                {workspaceTickets.map((ticket) => (
                  <div
                    key={ticket.ticketKey}
                    className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 rounded-lg border border-border/50 bg-background/50 p-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-foreground">{ticket.ticketKey}</div>
                      <div className="text-xs text-muted-foreground">{ticket.project}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-foreground">{ticket.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.status} · {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workspace tickets assigned during this time.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          {overtimeEntries.length > 0 ? (
            <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={onSubmit} disabled={loading}>
                {loading ? 'Ending Day...' : 'End Day'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
