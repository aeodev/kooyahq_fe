import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)

  if (date >= startOfToday) return 'Today'
  if (date >= startOfYesterday) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

const notificationTypeLabels: Record<NotificationType['type'], string> = {
  comment: 'Comment',
  reaction: 'Reaction',
  mention: 'Mention',
  post_created: 'Post Created',
  system: 'System',
  card_assigned: 'Card Assigned',
  card_comment: 'Card Comment',
  card_moved: 'Card Moved',
  board_member_added: 'Board Member Added',
  game_invitation: 'Game Invitation',
}

function getNotificationReference(notification: NotificationType): string | null {
  if (notification.cardId) return `Card ${notification.cardId}`
  if (notification.postId) return `Post ${notification.postId}`
  if (notification.boardId) return `Board ${notification.boardId}`
  if (notification.commentId) return `Comment ${notification.commentId}`
  return null
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

function getNotificationSummary(notification: NotificationType): { title: string; description?: string } {
  const message = getNotificationMessage(notification)
  const title = notification.title?.trim()

  if (title) {
    if (message && message !== title && message !== 'System notification') {
      return { title, description: message }
    }
    return { title }
  }

  return { title: message }
}

export function Notifications() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const {
    notifications,
    unreadCount,
    loading: isLoading,
    page,
    limit,
    hasMore,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()
  const navigate = useNavigate()
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

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      await fetchNotifications({
        unreadOnly: showUnreadOnly,
        page: page + 1,
        limit,
        append: true,
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const groupedNotifications = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const grouped = new Map<string, NotificationType[]>()

    sorted.forEach((notification) => {
      const label = getDateGroupLabel(notification.createdAt)
      const group = grouped.get(label)
      if (group) {
        group.push(notification)
      } else {
        grouped.set(label, [notification])
      }
    })

    return Array.from(grouped.entries()).map(([label, items]) => ({
      label,
      items,
    }))
  }, [notifications])

  if (!user || !canViewNotifications) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Tabs
            value={showUnreadOnly ? 'unread' : 'all'}
            onValueChange={(value) => setShowUnreadOnly(value === 'unread')}
          >
            <TabsList className="grid h-10 grid-cols-2">
              <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-sm">Unread</TabsTrigger>
            </TabsList>
          </Tabs>
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
            <>
              <div className="divide-y divide-border">
                {groupedNotifications.map((group) => (
                  <div key={group.label}>
                    <div className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                      {group.label}
                    </div>
                    <div className="divide-y divide-border">
                      {group.items.map((notification: NotificationType) => {
                        const { title, description } = getNotificationSummary(notification)
                        const reference = getNotificationReference(notification)
                        const actorName = notification.actor?.name ?? (notification.type === 'system' ? 'System' : null)
                        const typeLabel = notificationTypeLabels[notification.type]

                        return (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                              notification.url ? 'cursor-pointer hover:bg-muted/40' : ''
                            } ${!notification.read ? 'bg-primary/5' : ''}`}
                            onClick={() => {
                              if (notification.url) {
                                navigate(notification.url)
                              }
                            }}
                          >
                            <span
                              className={`mt-2 h-2 w-2 rounded-full ${
                                notification.read ? 'bg-transparent opacity-0' : 'bg-primary'
                              }`}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="space-y-1">
                                <p
                                  className={`text-sm ${
                                    notification.read ? 'text-foreground' : 'font-semibold text-foreground'
                                  }`}
                                >
                                  {title}
                                </p>
                                {description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {!notification.read && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                    Unread
                                  </span>
                                )}
                                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground">
                                  {typeLabel}
                                </span>
                                {actorName && <span>{`Actor: ${actorName}`}</span>}
                                {reference && <span>{`Ref: ${reference}`}</span>}
                                {notification.url && <span className="text-primary">View details</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                              <div
                                className="text-xs text-muted-foreground"
                                title={new Date(notification.createdAt).toLocaleString()}
                              >
                                <div className="text-sm font-medium text-foreground">
                                  {formatTime(notification.createdAt)}
                                </div>
                                <div>{formatDate(notification.createdAt)}</div>
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
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center border-t border-border px-6 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    See more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
