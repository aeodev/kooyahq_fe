import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useMyEntriesQuery, useActiveTimerQuery, useAnalyticsQuery } from '@/hooks/queries/time-entry.queries'
import { useAnnouncementsQuery, useAnnouncementQueryActions } from '@/hooks/queries/announcement.queries'
import { useUnreadCountQuery } from '@/hooks/queries/notification.queries'
import { useGameTypesQuery } from '@/hooks/queries/game.queries'
import { useAssignedTicketsQuery } from '@/hooks/queries/ticket.queries'
import { usePosts } from '@/hooks/post.hooks'
import { PERMISSIONS } from '@/constants/permissions'
import { useAnnouncementSocket } from '@/hooks/announcement.socket.hook'

export function useHomeData() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  
  // Permissions
  const permissions = useMemo(() => ({
    canManageAnnouncements: can(PERMISSIONS.ANNOUNCEMENT_CREATE) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    canReadTimeEntries: can(PERMISSIONS.TIME_ENTRY_READ) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    canViewTimeAnalytics: can(PERMISSIONS.TIME_ENTRY_ANALYTICS) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    canReadAnnouncements: can(PERMISSIONS.ANNOUNCEMENT_READ) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    canReadNotifications: can(PERMISSIONS.NOTIFICATION_READ) || can(PERMISSIONS.NOTIFICATION_FULL_ACCESS) || can(PERMISSIONS.NOTIFICATION_COUNT),
    canReadPosts: can(PERMISSIONS.POST_READ) || can(PERMISSIONS.POST_FULL_ACCESS),
    canReadGames: can(PERMISSIONS.GAME_READ) || can(PERMISSIONS.GAME_FULL_ACCESS),
    canReadBoards: can(PERMISSIONS.BOARD_VIEW) || can(PERMISSIONS.BOARD_VIEW_ALL) || can(PERMISSIONS.BOARD_FULL_ACCESS),
    hasAnyPermission: Array.isArray(user?.permissions) && user.permissions.length > 0
  }), [can, user])

  // Get today's date for analytics
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // TanStack Query hooks - all cached automatically
  const { data: myEntries = [], isLoading: entriesLoading } = useMyEntriesQuery()
  const { data: activeTimer } = useActiveTimerQuery()
  const { data: analytics } = useAnalyticsQuery(today, today, undefined, permissions.canViewTimeAnalytics)
  const { data: announcements = [] } = useAnnouncementsQuery(true)
  const { data: unreadCount = 0 } = useUnreadCountQuery(permissions.canReadNotifications)
  const { data: gameTypes = [] } = useGameTypesQuery()
  const { data: assignedTickets = [] } = useAssignedTicketsQuery(permissions.canReadBoards)
  
  // Posts already uses store with caching
  const { posts } = usePosts()
  
  // Also keep time entry store in sync for socket updates
  const storeActiveTimer = useTimeEntryStore((state) => state.activeTimer)
  const storeEntries = useTimeEntryStore((state) => state.entries)

  // Use store data if available (for real-time socket updates), otherwise query data
  const effectiveActiveTimer = storeActiveTimer ?? activeTimer
  const effectiveEntries = storeEntries.length > 0 ? storeEntries : myEntries

  // Computed Data
  const todayEntries = useMemo(() => {
    return effectiveEntries.filter((entry) => {
      const entryDate = new Date(entry.createdAt)
      return entryDate.toDateString() === new Date().toDateString()
    })
  }, [effectiveEntries])

  const todayTotalMinutes = useMemo(() => {
    return todayEntries.reduce((sum, entry) => {
      if (entry.isActive && entry.startTime) {
        const start = new Date(entry.startTime)
        return sum + Math.floor((Date.now() - start.getTime()) / 60000)
      }
      return sum + entry.duration
    }, 0)
  }, [todayEntries])

  // Expose refetch functions for mutations
  const { invalidateAnnouncements } = useAnnouncementQueryActions()

  // Listen for announcement socket events to update in real-time
  useAnnouncementSocket()

  // Only show loading on first load when we have no data
  const isLoading = entriesLoading && myEntries.length === 0 && !storeEntries.length

  return {
    user,
    permissions,
    data: {
      activeTimer: effectiveActiveTimer,
      todayEntries,
      analytics,
      announcements,
      unreadCount,
      posts,
      gameTypes,
      assignedTickets,
      todayTotalMinutes
    },
    isLoading,
    refetchAnnouncements: invalidateAnnouncements
  }
}
