import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadCount } from '@/hooks/notification.hooks'

export function NotificationBell() {
  const { count: unreadCount, fetchCount } = useUnreadCount()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Initial fetch on mount - real-time updates handled by socket events
    fetchCount()
  }, [fetchCount])

  // Refresh when navigating to/from notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      fetchCount()
    }
  }, [location.pathname, fetchCount])

  const handleClick = () => {
    if (location.pathname === '/notifications') {
      // If already on notifications page, go back
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        navigate('/')
      }
    } else {
      // Navigate to notifications
      navigate('/notifications')
    }
  }

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={handleClick}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-xl bg-red-500 text-xs text-white flex items-center justify-center ring-2 ring-background shadow-lg">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  )
}

