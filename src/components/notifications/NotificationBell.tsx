import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadCount } from '@/hooks/notification.hooks'

export function NotificationBell() {
  const { count: unreadCount, fetchCount } = useUnreadCount()

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchCount])

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to="/notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-xl bg-red-500 text-xs text-white flex items-center justify-center ring-2 ring-background shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  )
}

