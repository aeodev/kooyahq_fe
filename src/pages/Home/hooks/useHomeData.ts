import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { usePresenceStore } from '@/stores/presence.store'
import { useAnalytics } from '@/hooks/time-entry.hooks'
import { useAnnouncements } from '@/hooks/announcement.hooks'
import { useUnreadCount } from '@/hooks/notification.hooks'
import { usePosts } from '@/hooks/post.hooks'
import { useUsers } from '@/hooks/user.hooks'
import { useGameTypes } from '@/hooks/game.hooks'
import axiosInstance from '@/utils/axios.instance'
import { GET_AI_NEWS } from '@/utils/api.routes'
import { PERMISSIONS } from '@/constants/permissions'
import type { NewsItem } from '@/types/ai-news'
import type { TimeEntry } from '@/types/time-entry'

export function useHomeData() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  
  // Permissions
  const permissions = useMemo(() => ({
    canManageAnnouncements: can(PERMISSIONS.ANNOUNCEMENT_CREATE) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    canViewAINews: can(PERMISSIONS.AI_NEWS_READ) || can(PERMISSIONS.AI_NEWS_FULL_ACCESS),
    canReadTimeEntries: can(PERMISSIONS.TIME_ENTRY_READ) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    canViewTimeAnalytics: can(PERMISSIONS.TIME_ENTRY_ANALYTICS) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    canReadAnnouncements: can(PERMISSIONS.ANNOUNCEMENT_READ) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    canReadNotifications: can(PERMISSIONS.NOTIFICATION_READ) || can(PERMISSIONS.NOTIFICATION_FULL_ACCESS) || can(PERMISSIONS.NOTIFICATION_COUNT),
    canReadPosts: can(PERMISSIONS.POST_READ) || can(PERMISSIONS.POST_FULL_ACCESS),
    canReadGames: can(PERMISSIONS.GAME_READ) || can(PERMISSIONS.GAME_FULL_ACCESS),
    canViewPresence: can(PERMISSIONS.PRESENCE_READ) || can(PERMISSIONS.PRESENCE_FULL_ACCESS),
    hasAnyPermission: Array.isArray(user?.permissions) && user.permissions.length > 0
  }), [can, user])

  // Store access
  const { 
    activeTimer, 
    entries: myEntries,
    fetchActiveTimer, 
    fetchEntries 
  } = useTimeEntryStore()
  
  const { data: analytics, fetchAnalytics } = useAnalytics()
  const { announcements, fetchAnnouncements } = useAnnouncements()
  const { count: unreadCount, fetchCount: fetchUnreadCount } = useUnreadCount()
  const { posts, fetchPosts } = usePosts()
  const { users: allUsers } = useUsers()
  const { gameTypes, fetchGameTypes } = useGameTypes()
  const presenceUsers = usePresenceStore((state) => state.users)

  const [latestNews, setLatestNews] = useState<NewsItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!user || hasInitialized.current) return
    hasInitialized.current = true

    const today = new Date().toISOString().split('T')[0]

    const fetchData = async () => {
      try {
        const promises = []
        
        if (permissions.canReadTimeEntries) {
          promises.push(fetchActiveTimer().catch(() => null))
          promises.push(fetchEntries().catch(() => []))
        }
        
        if (permissions.canViewTimeAnalytics) {
          promises.push(fetchAnalytics(today, today).catch(() => null))
        }
        
        if (permissions.canReadAnnouncements) {
          promises.push(fetchAnnouncements(true).catch(() => []))
        }
        
        if (permissions.canReadNotifications) {
          promises.push(fetchUnreadCount().catch(() => 0))
        }
        
        if (permissions.canReadPosts) {
          promises.push(fetchPosts().catch(() => []))
        }
        
        if (permissions.canReadGames) {
          promises.push(fetchGameTypes().catch(() => []))
        }

        if (permissions.canViewAINews) {
           const newsPromise = axiosInstance.get<{ status: string; data: NewsItem[] }>(`${GET_AI_NEWS()}?limit=1`)
            .then((res) => setLatestNews(res.data.data[0] || null))
            .catch(() => setLatestNews(null))
           promises.push(newsPromise)
        }

        await Promise.all(promises)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, permissions, fetchActiveTimer, fetchEntries, fetchAnalytics, fetchAnnouncements, fetchUnreadCount, fetchPosts, fetchGameTypes])

  // Computed Data
  const todayEntries = useMemo(() => {
    return myEntries.filter((entry) => {
      const entryDate = new Date(entry.createdAt)
      return entryDate.toDateString() === new Date().toDateString()
    })
  }, [myEntries])

  const todayTotalMinutes = useMemo(() => {
    return todayEntries.reduce((sum, entry) => {
      if (entry.isActive && entry.startTime) {
        const start = new Date(entry.startTime)
        return sum + Math.floor((Date.now() - start.getTime()) / 60000)
      }
      return sum + entry.duration
    }, 0)
  }, [todayEntries])

  return {
    user,
    permissions,
    data: {
      activeTimer,
      todayEntries,
      analytics,
      announcements,
      unreadCount,
      posts,
      activeUsers: presenceUsers.filter(u => u.isActive),
      totalUsersCount: allUsers.length,
      gameTypes,
      latestNews,
      todayTotalMinutes
    },
    isLoading
  }
}

