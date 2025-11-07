import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TimeEntry = {
  id: string
  project: string
  task: string
  duration: string
  status: 'Billable' | 'Internal'
  time: string
}

type EntryListProps = {
  entries: TimeEntry[]
}

export function EntryList({ entries }: EntryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 hover:bg-card/70 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{entry.task}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">{entry.project}</p>
                    <span className="text-muted-foreground">·</span>
                    <Badge variant="outline" className="text-xs">
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{entry.time}</p>
                </div>
                <p className="text-lg font-semibold text-foreground whitespace-nowrap">{entry.duration}</p>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No entries yet today</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}



