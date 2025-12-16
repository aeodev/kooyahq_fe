import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Clock4, Bell, Calendar as CalendarIcon,
  MessageSquare, Globe, Sparkles, Gamepad2, Play, Megaphone,
  TrendingUp, Target, Zap, Trophy, History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { CreateAnnouncementForm } from '@/components/announcements/CreateAnnouncementForm'
import { useAuthStore } from '@/stores/auth.store'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { usePresenceStore } from '@/stores/presence.store'
import {
  useTimerDuration,
  useAnalytics,
  type AnalyticsData,
} from '@/hooks/time-entry.hooks'
import { useAnnouncements } from '@/hooks/announcement.hooks'
import { useUnreadCount } from '@/hooks/notification.hooks'
import { usePosts } from '@/hooks/post.hooks'
import { useUsers } from '@/hooks/user.hooks'
import { useGameTypes } from '@/hooks/game.hooks'
import axiosInstance from '@/utils/axios.instance'
import { GET_AI_NEWS } from '@/utils/api.routes'
import { PERMISSIONS } from '@/constants/permissions'
import type { TimeEntry } from '@/types/time-entry'
import type { Announcement } from '@/types/announcement'
import type { Post } from '@/types/post'
import type { NewsItem } from '@/types/ai-news'

// Cache configuration
const CACHE_DURATION = 1000 * 60 * 10 // 10 minutes
const CACHE_KEY = 'home-dashboard-data'

interface DashboardCache {
  entries: TimeEntry[]
  activeTimer: TimeEntry | null
  analytics: AnalyticsData | null
  announcements: Announcement[]
  unreadCount: number
  posts: Post[]
  activeUsersCount: number
  totalUsersCount: number
  latestNews: NewsItem | null
  gameTypes: Array<{ type: string; name: string; description: string }>
  timestamp: number
  dateRange?: string // For analytics
}

// Cache utilities
function getCachedDashboard(): DashboardCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed: DashboardCache = JSON.parse(cached)
    const age = Date.now() - parsed.timestamp

    if (age < CACHE_DURATION) {
      return parsed
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    console.error('Error reading dashboard cache:', error)
    return null
  }
}

function setCachedDashboard(data: Omit<DashboardCache, 'timestamp'>, dateRange?: string): void {
  try {
    const cache: DashboardCache = {
      ...data,
      timestamp: Date.now(),
      ...(dateRange && { dateRange }),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error setting dashboard cache:', error)
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  const date = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
}

export function Home() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const can = useAuthStore((state) => state.can)
  const hasAnyPermission = Array.isArray(user?.permissions) && user.permissions.length > 0
  const activeTimerFromStore = useTimeEntryStore((state) => state.activeTimer)
  const fetchActiveTimer = useTimeEntryStore((state) => state.fetchActiveTimer)
  const timerLoading = useTimeEntryStore((state) => state.loading.activeTimer)
  const myEntriesFromStore = useTimeEntryStore((state) => state.entries)
  const fetchEntries = useTimeEntryStore((state) => state.fetchEntries)
  const { data: analyticsFromStore, fetchAnalytics } = useAnalytics()
  const { announcements: announcementsFromStore, fetchAnnouncements } = useAnnouncements()
  const { count: unreadCountFromHook, fetchCount: fetchUnreadCount } = useUnreadCount()
  const { posts: postsFromStore, fetchPosts } = usePosts()
  const { users: allUsers } = useUsers()
  const { gameTypes, fetchGameTypes } = useGameTypes()
  const presenceUsers = usePresenceStore((state) => state.users)
  const [latestNews, setLatestNews] = useState<NewsItem | null>(null)
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)
  const hasInitialized = useRef(false)
  const canManageAnnouncements = useMemo(
    () => can(PERMISSIONS.ANNOUNCEMENT_CREATE) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    [can],
  )
  const canViewAINews = useMemo(
    () => can(PERMISSIONS.AI_NEWS_READ) || can(PERMISSIONS.AI_NEWS_FULL_ACCESS),
    [can],
  )
  const canReadTimeEntries = useMemo(
    () => can(PERMISSIONS.TIME_ENTRY_READ) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    [can],
  )
  const canViewTimeAnalytics = useMemo(
    () => can(PERMISSIONS.TIME_ENTRY_ANALYTICS) || can(PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
    [can],
  )
  const canReadAnnouncements = useMemo(
    () => can(PERMISSIONS.ANNOUNCEMENT_READ) || can(PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
    [can],
  )
  const canReadNotifications = useMemo(
    () =>
      can(PERMISSIONS.NOTIFICATION_READ) ||
      can(PERMISSIONS.NOTIFICATION_FULL_ACCESS) ||
      can(PERMISSIONS.NOTIFICATION_COUNT),
    [can],
  )
  const canReadPosts = useMemo(
    () => can(PERMISSIONS.POST_READ) || can(PERMISSIONS.POST_FULL_ACCESS),
    [can],
  )
  const canReadGames = useMemo(
    () => can(PERMISSIONS.GAME_READ) || can(PERMISSIONS.GAME_FULL_ACCESS),
    [can],
  )
  const canViewPresence = useMemo(
    () => can(PERMISSIONS.PRESENCE_READ) || can(PERMISSIONS.PRESENCE_FULL_ACCESS),
    [can],
  )

  // Initialize from cache
  const cachedData = useMemo(() => {
    const cached = getCachedDashboard()
    if (!cached) {
      return {
        entries: [],
        activeTimer: null,
        analytics: null,
        announcements: [],
        unreadCount: 0,
        posts: [],
        activeUsersCount: 0,
        totalUsersCount: 0,
        latestNews: null,
        gameTypes: [],
      }
    }

    const today = new Date().toISOString().split('T')[0]
    // Only use analytics cache if date range matches today
    const validAnalytics = cached.analytics && cached.dateRange === today ? cached.analytics : null

    const base = {
      entries: canReadTimeEntries ? cached.entries || [] : [],
      activeTimer: canReadTimeEntries ? cached.activeTimer : null,
      analytics: canViewTimeAnalytics ? validAnalytics : null,
      announcements: canReadAnnouncements ? cached.announcements || [] : [],
      unreadCount: canReadNotifications ? cached.unreadCount || 0 : 0,
      posts: canReadPosts ? cached.posts || [] : [],
      activeUsersCount: canViewPresence ? cached.activeUsersCount || 0 : 0,
      totalUsersCount: canViewPresence ? cached.totalUsersCount || 0 : 0,
      gameTypes: canReadGames ? cached.gameTypes || [] : [],
    }
    return {
      ...base,
      latestNews: canViewAINews ? cached.latestNews || null : null,
    }
  }, [
    canViewAINews,
    canReadTimeEntries,
    canViewTimeAnalytics,
    canReadAnnouncements,
    canReadNotifications,
    canReadPosts,
    canReadGames,
    canViewPresence,
  ])

  // Use store data when available, otherwise fall back to cached data
  const myEntries = canReadTimeEntries ? (myEntriesFromStore.length > 0 ? myEntriesFromStore : cachedData.entries) : []
  const activeTimer = canReadTimeEntries ? activeTimerFromStore ?? cachedData.activeTimer ?? null : null
  const announcements = canReadAnnouncements
    ? announcementsFromStore.length > 0
      ? announcementsFromStore
      : cachedData.announcements
    : []
  const analytics = canViewTimeAnalytics ? analyticsFromStore || cachedData.analytics : null
  const unreadCount = canReadNotifications ? (unreadCountFromHook > 0 ? unreadCountFromHook : cachedData.unreadCount) : 0
  const posts = canReadPosts ? (postsFromStore.length > 0 ? postsFromStore : cachedData.posts) : []
  const activeUsersCount = presenceUsers.length > 0 ? presenceUsers.filter(u => u.isActive).length : cachedData.activeUsersCount
  const totalUsersCount = allUsers.length > 0 ? allUsers.length : cachedData.totalUsersCount
  const latestNewsItem = canViewAINews ? latestNews || cachedData.latestNews : null
  const activeUsersList = presenceUsers.filter(u => u.isActive).slice(0, 4)
  const availableGames = canReadGames ? (gameTypes.length > 0 ? gameTypes : cachedData.gameTypes) : []

  const timerDuration = useTimerDuration(activeTimer)

  if (!hasAnyPermission) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold">Your account has no permissions assigned.</p>
          <p className="text-sm text-muted-foreground">Please contact an admin to grant access.</p>
          <div className="flex justify-center">
            <Button onClick={logout} variant="outline">Log out</Button>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true

      const today = new Date()
      const startDate = today.toISOString().split('T')[0]

      // Fetch all data in parallel
      const aiNewsPromise = canViewAINews
        ? axiosInstance
            .get<{ status: string; data: NewsItem[] }>(`${GET_AI_NEWS()}?limit=1`)
            .then((res) => res.data.data[0] || null)
            .catch(() => null)
        : Promise.resolve(null)

      const timerPromise = canReadTimeEntries ? fetchActiveTimer().catch(() => null) : Promise.resolve(null)
      const entriesPromise = canReadTimeEntries ? fetchEntries().catch(() => []) : Promise.resolve([])
      const announcementsPromise = canReadAnnouncements ? fetchAnnouncements(true).catch(() => []) : Promise.resolve([])
      const analyticsPromise = canViewTimeAnalytics ? fetchAnalytics(startDate, startDate).catch(() => null) : Promise.resolve(null)
      const unreadCountPromise = canReadNotifications ? fetchUnreadCount().catch(() => 0) : Promise.resolve(0)
      const postsPromise = canReadPosts ? fetchPosts().catch(() => []) : Promise.resolve([])
      const gameTypesPromise = canReadGames ? fetchGameTypes().catch(() => []) : Promise.resolve([])

      Promise.all([
        timerPromise,
        entriesPromise,
        announcementsPromise,
        analyticsPromise,
        unreadCountPromise,
        postsPromise,
        gameTypesPromise,
        aiNewsPromise,
      ])
        .then(([timer, entries, announcements, analytics, unreadCount, posts, gameTypes, news]) => {
          if (news && canViewAINews) setLatestNews(news)
          // Update cache with fresh data
          setCachedDashboard(
            {
              entries: entries || [],
              activeTimer: timer,
              analytics: analytics,
              announcements: announcements || [],
              unreadCount: unreadCount || 0,
              posts: posts || [],
              activeUsersCount: canViewPresence ? presenceUsers.filter((u) => u.isActive).length : 0,
              totalUsersCount: canViewPresence ? allUsers.length : 0,
              latestNews: canViewAINews ? news : null,
              gameTypes: gameTypes || [],
            },
            startDate
          )
        })
        .catch((error) => {
          console.error('Error fetching dashboard data:', error)
        })
    }
  }, [
    user,
    fetchActiveTimer,
    fetchEntries,
    fetchAnnouncements,
    fetchAnalytics,
    fetchUnreadCount,
    fetchPosts,
    fetchGameTypes,
    presenceUsers,
    allUsers,
    canViewAINews,
    canReadTimeEntries,
    canReadAnnouncements,
    canViewTimeAnalytics,
    canReadNotifications,
    canReadPosts,
    canReadGames,
    canViewPresence,
  ])

  if (!user) {
    return null
  }

  const todayEntries = myEntries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  const todayTotalMinutes = todayEntries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      return sum + Math.floor(diffMs / 60000)
    }
    return sum + entry.duration
  }, 0)

  const activeAnnouncement = announcements[0]
  const latestPost = posts[0]

  // Get dates with time entries for calendar marking
  const markedDates = useMemo(() => {
    const dates = new Set<string>()
    myEntries.forEach((entry) => {
      const entryDate = new Date(entry.createdAt)
      const dateKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`
      dates.add(dateKey)
    })
    return dates
  }, [myEntries])

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal">
              {formatDate()}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {canManageAnnouncements && (
              <Button
                onClick={() => setShowCreateAnnouncement(true)}
                variant="default"
                size="sm"
                className="h-9"
              >
                <Megaphone className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="relative hidden sm:flex">
              <Link to="/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
              <Link to="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Create Announcement Modal (Admin Only) */}
      {canManageAnnouncements && (
        <CreateAnnouncementForm
          open={showCreateAnnouncement}
          onClose={() => setShowCreateAnnouncement(false)}
          onSuccess={() => {
            fetchAnnouncements(true)
            setShowCreateAnnouncement(false)
          }}
        />
      )}

      {/* Active Announcements */}
      {activeAnnouncement && (
        <div className="space-y-3">
          <AnnouncementCard
            key={activeAnnouncement.id}
            announcement={activeAnnouncement}
            onDelete={() => fetchAnnouncements(true)}
          />
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {canReadTimeEntries && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Today's Time</CardDescription>
              <CardTitle className="text-2xl">
                {analytics ? (
                  `${Math.round(analytics.totalHours * 10) / 10}h`
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {todayEntries.length} {todayEntries.length === 1 ? 'entry' : 'entries'}
              </p>
            </CardContent>
          </Card>
        )}

        {canReadTimeEntries && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Timer</CardDescription>
              <CardTitle className="text-2xl">
                {timerLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : activeTimer && activeTimer.isActive ? (
                  timerDuration
                ) : (
                  <span className="text-muted-foreground text-sm">Not running</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTimer && activeTimer.isActive ? (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/time-tracker">View Timer</Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/time-tracker">Start Timer</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {canReadNotifications && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Notifications</CardDescription>
              <CardTitle className="text-2xl">{unreadCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/notifications">
                  {unreadCount > 0 ? 'View' : 'All Read'} <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canViewPresence && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Teammates</CardDescription>
              <CardTitle className="text-2xl">
                {totalUsersCount > 0 ? (
                  `${activeUsersCount}/${totalUsersCount}`
                ) : (
                  <Skeleton className="h-8 w-16" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/presence">
                  View Map <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canReadTimeEntries && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Today's Entries</CardDescription>
              <CardTitle className="text-2xl">{todayEntries.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/time-tracker">
                  View All <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {canReadTimeEntries && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock4 className="h-5 w-5 text-primary" />
                <CardTitle>Time Tracker</CardTitle>
              </div>
              <CardDescription>
                {timerLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : activeTimer && activeTimer.isActive ? (
                  `Running: ${timerDuration}`
                ) : todayTotalMinutes > 0 ? (
                  `${formatDuration(todayTotalMinutes)} today`
                ) : (
                  'No time tracked today'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1">
                {activeTimer && activeTimer.isActive ? (
                  <div className="text-sm">
                    <p className="font-medium">{activeTimer.tasks[activeTimer.tasks.length - 1]?.text || 'No task'}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeTimer.projects.join(', ')}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No active timer</div>
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/time-tracker">
                  View Tracker <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canReadPosts && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Feed</CardTitle>
              </div>
              <CardDescription>
                {posts.length > 0 ? (
                  `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`
                ) : (
                  <Skeleton className="h-4 w-16" />
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1">
                {latestPost ? (
                  <div className="text-sm">
                    <p className="font-medium line-clamp-2">{latestPost.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {latestPost.author?.name || 'Unknown'}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No posts yet</div>
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/feed">
                  View Feed <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canViewPresence && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Presence</CardTitle>
              </div>
              <CardDescription>
                {totalUsersCount > 0 ? (
                  `${activeUsersCount} of ${totalUsersCount} active`
                ) : (
                  <Skeleton className="h-4 w-24" />
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1">
                {activeUsersList.length > 0 ? (
                  <div className="space-y-2">
                    {activeUsersList.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    ))}
                    {activeUsersCount > activeUsersList.length && (
                      <p className="text-xs text-muted-foreground">
                        +{activeUsersCount - activeUsersList.length} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No active users</div>
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/presence">
                  View Map <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canViewAINews && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI News</CardTitle>
              </div>
              <CardDescription>Latest tech news</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1">
                {latestNewsItem ? (
                  <p className="font-medium text-sm line-clamp-3 leading-relaxed">
                    {latestNewsItem.title}
                  </p>
                ) : (
                  <Skeleton className="h-12 w-full" />
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/ai-news">
                  Read More <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canReadGames && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <CardTitle>Games</CardTitle>
              </div>
              <CardDescription>Play with teammates</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1 space-y-2">
                {availableGames.length > 0 ? (
                  <>
                    {availableGames
                      .filter((game) => game.type === 'tic-tac-toe' || game.type === 'reaction-test')
                      .map((game) => (
                        <div key={game.type} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card/30">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{game.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {game.description || (game.type === 'tic-tac-toe' ? 'Classic 3x3 grid strategy game' : 'Test your reaction speed')}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="ml-2">
                            <Link to={`/games/play/${game.type}`}>
                              <Play className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    {availableGames.filter((game) => game.type === 'tic-tac-toe' || game.type === 'reaction-test').length === 0 && (
                      <div className="text-sm text-muted-foreground">No games available</div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/games">
                  View All Games <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {canReadTimeEntries && (
          <Card className="hover:shadow-lg transition-shadow flex flex-col min-h-[200px]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Your latest time entries</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="flex-1 space-y-2">
                {todayEntries.length > 0 ? (
                  <>
                    {todayEntries.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card/30">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {entry.tasks[entry.tasks.length - 1]?.text || 'No task'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.isActive ? 'In progress' : `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}m`}
                          </p>
                        </div>
                        {entry.isActive && (
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-2" />
                        )}
                      </div>
                    ))}
                    {todayEntries.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{todayEntries.length - 3} more entries
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No entries today
                  </div>
                )}
              </div>
              <Button asChild className="w-full mt-auto">
                <Link to="/time-tracker">
                  View All Entries <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Section */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="flex flex-col sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle>Calendar</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <Calendar markedDates={markedDates} />
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        {canViewTimeAnalytics && (
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Weekly Progress</CardTitle>
              </div>
              <CardDescription>Your productivity this week</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock4 className="h-3 w-3" />
                    <span>Hours Logged</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {analytics ? `${Math.round(analytics.totalHours * 10) / 10}h` : '0h'}
                  </p>
                </div>
                <div className="space-y-1 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>Entries</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{todayEntries.length}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily goal progress</span>
                  <span className="font-medium">{analytics ? Math.min(Math.round((analytics.totalHours / 8) * 100), 100) : 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                    style={{ width: `${analytics ? Math.min((analytics.totalHours / 8) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {canReadTimeEntries && !activeTimer?.isActive && (
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-11">
                <Link to="/time-tracker">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Start Timer</p>
                    <p className="text-xs text-muted-foreground">Begin tracking your work</p>
                  </div>
                </Link>
              </Button>
            )}
            {canReadPosts && (
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-11">
                <Link to="/feed">
                  <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Share Update</p>
                    <p className="text-xs text-muted-foreground">Post to the team feed</p>
                  </div>
                </Link>
              </Button>
            )}
            {canReadGames && (
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-11">
                <Link to="/games">
                  <div className="h-7 w-7 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Play a Game</p>
                    <p className="text-xs text-muted-foreground">Challenge your teammates</p>
                  </div>
                </Link>
              </Button>
            )}
            {canViewPresence && (
              <Button asChild variant="outline" className="w-full justify-start gap-3 h-11">
                <Link to="/presence">
                  <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">View Presence</p>
                    <p className="text-xs text-muted-foreground">See who's online</p>
                  </div>
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
