import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const metadata =
    notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : null
  const ticketKey = metadata && typeof metadata.ticketKey === 'string' ? metadata.ticketKey : null
  const boardName = metadata && typeof metadata.boardName === 'string' ? metadata.boardName : null

  if (ticketKey) return `Ticket ${ticketKey}`
  if (boardName) return `Board ${boardName}`
  if (notification.url) {
    const match = notification.url.match(/^\/workspace\/([^/]+)(?:\/([^/]+))?/)
    if (match) {
      const [, boardKey, ticketKey] = match
      if (ticketKey) return `Ticket ${ticketKey}`
      if (boardKey) return `Board ${boardKey}`
    }
  }
  if (notification.cardId) return `Card ${notification.cardId}`
  if (notification.postId) return `Post ${notification.postId}`
  if (notification.boardId) return `Board ${notification.boardId}`
  if (notification.commentId) return `Comment ${notification.commentId}`
  return null
}

function getNotificationMessage(notification: NotificationType): string {
  const reference = getNotificationReference(notification)
  switch (notification.type) {
    case 'comment':
      return notification.actor
        ? `${notification.actor.name} commented on ${reference ?? 'your post'}`
        : `Someone commented on ${reference ?? 'your post'}`
    case 'reaction':
      return notification.actor
        ? `${notification.actor.name} reacted to ${reference ?? 'your post'}`
        : `Someone reacted to ${reference ?? 'your post'}`
    case 'mention':
      return notification.actor
        ? `${notification.actor.name} mentioned you${reference ? ` in ${reference}` : ''}`
        : `Someone mentioned you${reference ? ` in ${reference}` : ''}`
    case 'post_created':
      return `A new post was created${reference ? ` (${reference})` : ''}`
    case 'system':
      return notification.title || 'System notification'
    case 'card_assigned':
      return notification.actor
        ? `${notification.actor.name} assigned you to ${reference ?? 'a card'}`
        : `You were assigned to ${reference ?? 'a card'}`
    case 'card_comment':
      return notification.actor
        ? `${notification.actor.name} commented on ${reference ?? 'your card'}`
        : `Someone commented on ${reference ?? 'your card'}`
    case 'card_moved':
      return notification.actor
        ? `${notification.actor.name} moved ${reference ?? 'a card'}`
        : `A card was moved${reference ? ` (${reference})` : ''}`
    case 'board_member_added':
      return notification.actor
        ? `${notification.actor.name} added you to ${reference ?? 'a board'}`
        : `You were added to ${reference ?? 'a board'}`
    case 'game_invitation':
      return notification.actor ? `${notification.actor.name} invited you to play ${notification.title?.replace('Game invitation: ', '') || 'a game'}` : 'You were invited to play a game'
    default:
      return 'New notification'
  }
}

function getNotificationSummary(notification: NotificationType): { title: string; description?: string } {
  const message = getNotificationMessage(notification)
  const title = notification.title?.trim()
  const metadata =
    notification.metadata && typeof notification.metadata === 'object' && !Array.isArray(notification.metadata)
      ? (notification.metadata as Record<string, unknown>)
      : null
  const metadataSummary =
    metadata && typeof metadata.summary === 'string' && metadata.summary.trim()
      ? metadata.summary.trim()
      : undefined
  const commentPreview =
    metadata && typeof metadata.commentPreview === 'string' && metadata.commentPreview.trim()
      ? metadata.commentPreview.trim()
      : undefined
  const detailSummary = metadataSummary || commentPreview

  if (title) {
    if (detailSummary && detailSummary !== title) {
      return { title, description: detailSummary }
    }
    if (message && message !== title && message !== 'System notification') {
      return { title, description: message }
    }
    return { title }
  }

  if (detailSummary && detailSummary !== message) {
    return { title: message, description: detailSummary }
  }

  return { title: message }
}

function formatMetadataLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const printable = value.filter(
      (item) => ['string', 'number', 'boolean'].includes(typeof item)
    ) as Array<string | number | boolean>
    if (printable.length > 0) {
      return printable.map((item) => String(item)).join(', ')
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function truncateMetadataValue(value: string, maxLength = 240): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}

export function Notifications() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<NotificationType | null>(null)
  const {
    notifications,
    unreadCount,
    loading: isLoading,
    page,
    limit,
    total,
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
    if (!canUpdateNotifications) return false
    const didMark = await markAsRead(id)
    if (didMark) {
      setSelectedNotification((prev) => (prev && prev.id === id ? { ...prev, read: true } : prev))
    }
    // Refresh notifications if showing unread only to update the list
    if (showUnreadOnly) {
      await fetchNotifications(showUnreadOnly)
    }
    return didMark
  }

  const handleNotificationClick = (notification: NotificationType) => {
    setSelectedNotification(notification)
    if (!notification.read && canUpdateNotifications) {
      void handleMarkAsRead(notification.id)
    }
  }

  const handleSeeMore = () => {
    if (!selectedNotification?.url) return
    if (!selectedNotification.read && canUpdateNotifications) {
      void handleMarkAsRead(selectedNotification.id)
    }
    const destination = selectedNotification.url
    setSelectedNotification(null)
    navigate(destination)
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

  const selectedSummary = selectedNotification ? getNotificationSummary(selectedNotification) : null
  const selectedTypeLabel = selectedNotification ? notificationTypeLabels[selectedNotification.type] : ''
  const selectedActorName =
    selectedNotification?.actor?.name ?? (selectedNotification?.type === 'system' ? 'System' : null)
  const selectedReference = selectedNotification ? getNotificationReference(selectedNotification) : null
  const selectedTimestamp = selectedNotification ? new Date(selectedNotification.createdAt).toLocaleString() : ''
  const selectedMetadataEntries = useMemo(() => {
    if (!selectedNotification?.metadata || typeof selectedNotification.metadata !== 'object' || Array.isArray(selectedNotification.metadata)) {
      return []
    }
    const metadata = selectedNotification.metadata as Record<string, unknown>
    const descriptionValue = selectedSummary?.description?.trim()
    const excludedKeys = new Set<string>(['summary'])
    if (descriptionValue) {
      if (metadata.summary === descriptionValue) excludedKeys.add('summary')
      if (metadata.commentPreview === descriptionValue) excludedKeys.add('commentPreview')
    }

    return Object.entries(metadata)
      .filter(([key, value]) => !excludedKeys.has(key) && value !== undefined && value !== null)
      .map(([key, value]) => ({
        key,
        label: formatMetadataLabel(key),
        value: truncateMetadataValue(formatMetadataValue(value)),
      }))
      .filter((entry) => entry.value)
  }, [selectedNotification, selectedSummary])

  if (!user || !canViewNotifications) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              {total > 0 && <span>{` • ${total} total`}</span>}
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
                        const detailHint = notification.url ? 'See more' : 'View details'

                        return (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer hover:bg-muted/40 ${
                              !notification.read ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
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
                                <span className="text-primary">{detailHint}</span>
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

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) setSelectedNotification(null)
        }}
      >
        {selectedNotification && selectedSummary && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selectedSummary.title}</DialogTitle>
              {selectedSummary.description && (
                <DialogDescription>{selectedSummary.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="font-medium">{selectedNotification.read ? 'Read' : 'Unread'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Type</div>
                    <div className="font-medium">{selectedTypeLabel}</div>
                  </div>
                  {selectedActorName && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Actor</div>
                      <div className="font-medium">{selectedActorName}</div>
                      {selectedNotification.actor?.email && (
                        <div className="text-xs text-muted-foreground">{selectedNotification.actor.email}</div>
                      )}
                    </div>
                  )}
                  {selectedReference && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Reference</div>
                      <div className="font-medium">{selectedReference}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Received</div>
                    <div className="font-medium">{selectedTimestamp}</div>
                  </div>
                </div>
              </div>
              {selectedMetadataEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs uppercase text-muted-foreground">Details</div>
                  <div className="grid gap-2">
                    {selectedMetadataEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex flex-col gap-1 rounded-md border border-border/60 bg-background px-3 py-2"
                      >
                        <div className="text-[11px] uppercase text-muted-foreground">{entry.label}</div>
                        <div className="text-sm font-medium text-foreground break-words">{entry.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedNotification(null)}>
                Close
              </Button>
              {selectedNotification.url && (
                <Button onClick={handleSeeMore}>See more</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
