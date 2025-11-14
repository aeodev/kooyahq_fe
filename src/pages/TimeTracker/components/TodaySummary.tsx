type TodaySummaryProps = {
  totalHours: string
  entryCount: number
}

export function TodaySummary({ totalHours, entryCount }: TodaySummaryProps) {
  return (
    <div className="flex items-center justify-between p-6 rounded-xl border border-border/60 bg-muted/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground leading-5">Today&apos;s Total</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{totalHours}</p>
      </div>
      <div className="text-right space-y-1">
        <p className="text-sm font-medium text-muted-foreground leading-5">Entries</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{entryCount}</p>
      </div>
    </div>
  )
}



