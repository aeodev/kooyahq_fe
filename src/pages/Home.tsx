import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Clock4, Kanban, Bell, Calendar as CalendarIcon,
  MessageSquare, Globe, Sparkles, Gamepad2, Play, Plus, Megaphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { CreateAnnouncementForm } from '@/components/announcements/CreateAnnouncementForm'
import { useAuthStore } from '@/stores/auth.store'
import { useBoardStore } from '@/stores/board.store'
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
import type { Board } from '@/types/board'
import type { TimeEntry } from '@/types/time-entry'
import type { Announcement } from '@/types/announcement'
import type { Post } from '@/types/post'
import type { NewsItem } from '@/types/ai-news'

// Cache configuration
const CACHE_DURATION = 1000 * 60 * 10 // 10 minutes
const CACHE_KEY = 'home-dashboard-data'

interface DashboardCache {
  boards: Board[]
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
  const boardsFromStore = useBoardStore((state) => state.boards)
  const fetchBoards = useBoardStore((state) => state.fetchBoards)
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

  // Initialize from cache
  const cachedData = useMemo(() => {
    const cached = getCachedDashboard()
    if (!cached) {
      return {
        boards: [],
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

    return {
      boards: cached.boards || [],
      entries: cached.entries || [],
      activeTimer: cached.activeTimer,
      analytics: validAnalytics,
      announcements: cached.announcements || [],
      unreadCount: cached.unreadCount || 0,
      posts: cached.posts || [],
      activeUsersCount: cached.activeUsersCount || 0,
      totalUsersCount: cached.totalUsersCount || 0,
      latestNews: cached.latestNews || null,
      gameTypes: cached.gameTypes || [],
    }
  }, [])

  // Use store data when available, otherwise fall back to cached data
  const boards = boardsFromStore.length > 0 ? boardsFromStore : cachedData.boards
  const myEntries = myEntriesFromStore.length > 0 ? myEntriesFromStore : cachedData.entries
  const activeTimer = activeTimerFromStore ?? cachedData.activeTimer ?? null
  const announcements = announcementsFromStore.length > 0 ? announcementsFromStore : cachedData.announcements
  const analytics = analyticsFromStore || cachedData.analytics
  const unreadCount = unreadCountFromHook > 0 ? unreadCountFromHook : cachedData.unreadCount
  const posts = postsFromStore.length > 0 ? postsFromStore : cachedData.posts
  const activeUsersCount = presenceUsers.length > 0 ? presenceUsers.filter(u => u.isActive).length : cachedData.activeUsersCount
  const totalUsersCount = allUsers.length > 0 ? allUsers.length : cachedData.totalUsersCount
  const latestNewsItem = latestNews || cachedData.latestNews
  const activeUsersList = presenceUsers.filter(u => u.isActive).slice(0, 4)
  const availableGames = gameTypes.length > 0 ? gameTypes : cachedData.gameTypes

  const timerDuration = useTimerDuration(activeTimer)

  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true

      const today = new Date()
      const startDate = today.toISOString().split('T')[0]

      // Fetch all data in parallel
      Promise.all([
        fetchBoards().catch(() => []),
        fetchActiveTimer().catch(() => null),
        fetchEntries().catch(() => []),
        fetchAnnouncements(true).catch(() => []),
        fetchAnalytics(startDate, startDate).catch(() => null),
        fetchUnreadCount().catch(() => 0),
        fetchPosts().catch(() => []),
        fetchGameTypes().catch(() => []),
        axiosInstance.get<{ status: string; data: NewsItem[] }>(`${GET_AI_NEWS()}?limit=1`).then(res => res.data.data[0] || null).catch(() => null),
      ]).then(([boards, timer, entries, announcements, analytics, unreadCount, posts, gameTypes, news]) => {
        if (news) setLatestNews(news)
        // Update cache with fresh data
        setCachedDashboard({
          boards: boards || [],
          entries: entries || [],
          activeTimer: timer,
          analytics: analytics,
          announcements: announcements || [],
          unreadCount: unreadCount || 0,
          posts: posts || [],
          activeUsersCount: presenceUsers.filter(u => u.isActive).length,
          totalUsersCount: allUsers.length,
          latestNews: news,
          gameTypes: gameTypes || [],
        }, startDate)
      }).catch((error) => {
        console.error('Error fetching dashboard data:', error)
      })
    }
  }, [user, fetchBoards, fetchActiveTimer, fetchEntries, fetchAnnouncements, fetchAnalytics, fetchUnreadCount, fetchPosts, fetchGameTypes, presenceUsers, allUsers])

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

  const recentBoards = boards.slice(0, 4)
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
            {user.isAdmin && (
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
      {user.isAdmin && (
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
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Boards</CardDescription>
            <CardTitle className="text-2xl">{boards.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/workspace">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

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
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-primary" />
              <CardTitle>Workspace</CardTitle>
            </div>
            <CardDescription>
              {boards.length > 0 ? (
                `${boards.length} ${boards.length === 1 ? 'board' : 'boards'}`
              ) : (
                <Skeleton className="h-4 w-20" />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3">
            <div className="flex-1">
              {recentBoards.length > 0 ? (
                <div className="space-y-2">
                  {recentBoards.slice(0, 2).map((board) => (
                    <div key={board.id} className="text-sm">
                      <p className="font-medium">{board.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{board.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No boards yet</div>
              )}
            </div>
            <Button asChild className="w-full mt-auto">
              <Link to="/workspace">
                Go to Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
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
                  <p className="font-medium">{activeTimer.task}</p>
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

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
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

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
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

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI News</CardTitle>
            </div>
            <CardDescription>Latest tech news</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3">
            <div className="flex-1">
              {latestNewsItem ? (
                <p className="font-medium text-sm line-clamp-4 leading-relaxed">
                  {latestNewsItem.title}
                </p>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
            </div>
            <Button asChild className="w-full mt-auto">
              <Link to="/ai-news">
                Read More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-[340px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <CardTitle>Games</CardTitle>
            </div>
            <CardDescription>Play with teammates</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-3">
            <div className="flex-1 space-y-3">
              {availableGames.length > 0 ? (
                <>
                  {availableGames
                    .filter((game) => game.type === 'tic-tac-toe' || game.type === 'reaction-test')
                    .map((game) => (
                      <div key={game.type} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card/30">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{game.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {game.description || (game.type === 'tic-tac-toe' ? 'Classic 3x3 strategy' : 'Test your reaction speed')}
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
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
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
      </div>

      {/* Activity Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col h-[500px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle>Calendar</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <Calendar markedDates={markedDates} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="flex flex-col h-[500px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Kanban className="h-5 w-5 text-primary" />
                  <CardTitle>Recent Boards</CardTitle>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/workspace">
                    View All <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {recentBoards.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No boards yet.</p>
                  <Button asChild>
                    <Link to="/workspace">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Board
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentBoards.map((board) => (
                    <Link
                      key={board.id}
                      to={`/workspace/${board.id}`}
                      className="block p-3 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{board.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{board.type}</p>
                        </div>
                        <Badge variant="outline">{board.columns.length} columns</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
