type TodaySummaryProps = {
  totalHours: string
  entryCount: number
}

export function TodaySummary({ totalHours, entryCount }: TodaySummaryProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
      <div>
        <p className="text-sm text-muted-foreground">Today&apos;s Total</p>
        <p className="text-2xl font-bold">{totalHours}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-muted-foreground">Entries</p>
        <p className="text-2xl font-bold">{entryCount}</p>
      </div>
    </div>
  )
}



