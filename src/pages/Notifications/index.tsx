import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/notification.hooks'
import { useNavigate } from 'react-router-dom'
import type { Notification as NotificationType } from '@/types/post'
import { PERMISSIONS } from '@/constants/permissions'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function getNotificationMessage(notification: NotificationType): string {
  switch (notification.type) {
    case 'comment':
      return notification.actor ? `${notification.actor.name} commented on your post` : 'Someone commented on your post'
    case 'reaction':
      return notification.actor ? `${notification.actor.name} reacted to your post` : 'Someone reacted to your post'
    case 'mention':
      return notification.actor ? `${notification.actor.name} mentioned you` : 'Someone mentioned you'
    case 'post_created':
      return 'A new post was created'
    case 'system':
      return notification.title || 'System notification'
    case 'card_assigned':
      return notification.actor ? `${notification.actor.name} assigned you to a card` : 'You were assigned to a card'
    case 'card_comment':
      return notification.actor ? `${notification.actor.name} commented on your card` : 'Someone commented on your card'
    case 'card_moved':
      return notification.actor ? `${notification.actor.name} moved a card` : 'A card was moved'
    case 'board_member_added':
      return notification.actor ? `${notification.actor.name} added you to a board` : 'You were added to a board'
    case 'game_invitation':
      return notification.actor ? `${notification.actor.name} invited you to play ${notification.title?.replace('Game invitation: ', '') || 'a game'}` : 'You were invited to play a game'
    default:
      return 'New notification'
  }
}

export function Notifications() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const {
    notifications,
    unreadCount,
    loading: isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()
  const canViewNotifications = can(PERMISSIONS.NOTIFICATION_READ) || can(PERMISSIONS.NOTIFICATION_FULL_ACCESS)
  const canUpdateNotifications = can(PERMISSIONS.NOTIFICATION_UPDATE) || can(PERMISSIONS.NOTIFICATION_FULL_ACCESS)

  useEffect(() => {
    if (user && canViewNotifications) {
      fetchNotifications(showUnreadOnly)
    }
  }, [user, showUnreadOnly, fetchNotifications, canViewNotifications])

  const handleMarkAsRead = async (id: string) => {
    if (!canUpdateNotifications) return
    await markAsRead(id)
    // Refresh notifications if showing unread only to update the list
    if (showUnreadOnly) {
      fetchNotifications(showUnreadOnly)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!canUpdateNotifications) return
    await markAllAsRead()
    // Refresh notifications if showing unread only to update the list
    if (showUnreadOnly) {
      fetchNotifications(showUnreadOnly)
    }
  }

  if (!user || !canViewNotifications) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showUnreadOnly ? 'default' : 'outline'}
              size="default"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="h-10 px-4 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
              disabled={!canViewNotifications}
            >
              {showUnreadOnly ? 'Show All' : 'Unread Only'}
            </Button>
            {unreadCount > 0 && canUpdateNotifications && (
              <Button 
                size="default" 
                variant="outline" 
                onClick={handleMarkAllAsRead}
                className="h-10 px-4 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification: NotificationType) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl transition-all duration-300 ${
                    !notification.read ? 'bg-primary/5 backdrop-blur-sm border-l-4 border-l-primary' : ''
                  } ${notification.url ? 'hover:bg-accent/50 cursor-pointer' : ''}`}
                  onClick={() => {
                    if (notification.url) {
                      navigate(notification.url)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm">{getNotificationMessage(notification)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
                      {notification.url && (
                        <p className="text-xs text-primary mt-2">View details →</p>
                      )}
                    </div>
                    {!notification.read && canUpdateNotifications && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
