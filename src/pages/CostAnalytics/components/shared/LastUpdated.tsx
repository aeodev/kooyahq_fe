import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LastUpdatedProps {
  timestamp: Date | null
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  const [relativeTime, setRelativeTime] = useState<string>('')

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('')
      return
    }

    const updateRelativeTime = () => {
      const distance = formatDistanceToNow(timestamp, { addSuffix: true })
      setRelativeTime(distance)
    }

    // Update immediately
    updateRelativeTime()

    // Update every 30 seconds
    const interval = setInterval(updateRelativeTime, 30000)

    return () => clearInterval(interval)
  }, [timestamp])

  if (!timestamp || !relativeTime) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Updated {relativeTime}</span>
    </div>
  )
}
