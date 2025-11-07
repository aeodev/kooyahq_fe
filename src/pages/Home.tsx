import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock4, Kanban, Play, Plus, Loader2, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { CreateAnnouncementForm } from '@/components/announcements/CreateAnnouncementForm'
import { useAuthStore } from '@/stores/auth.store'
import { useBoardStore } from '@/stores/board.store'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import {
  useTimerDuration,
  useAnalytics,
} from '@/hooks/time-entry.hooks'
import { useAnnouncements } from '@/hooks/announcement.hooks'

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


export function Home() {
  const user = useAuthStore((state) => state.user)
  const boards = useBoardStore((state) => state.boards)
  const boardsLoading = useBoardStore((state) => state.loading.boards)
  const fetchBoards = useBoardStore((state) => state.fetchBoards)
  const activeTimer = useTimeEntryStore((state) => state.activeTimer)
  const fetchActiveTimer = useTimeEntryStore((state) => state.fetchActiveTimer)
  const myEntries = useTimeEntryStore((state) => state.entries)
  const fetchEntries = useTimeEntryStore((state) => state.fetchEntries)
  const timerDuration = useTimerDuration(activeTimer)
  const { data: analytics, fetchAnalytics } = useAnalytics()
  
  const { announcements, loading: announcementsLoading, fetchAnnouncements } = useAnnouncements()
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)
  const isLoading = useAuthStore((state) => state.isLoading)
  
  useEffect(() => {
    // Only fetch when user is authenticated and auth is fully loaded
    if (user && !isLoading) {
      fetchBoards()
      fetchActiveTimer()
      fetchEntries()
      fetchAnnouncements(true)
      const today = new Date()
      const startDate = today.toISOString().split('T')[0]
      fetchAnalytics(startDate, startDate)
    }
  }, [user, isLoading, fetchBoards, fetchActiveTimer, fetchEntries, fetchAnnouncements, fetchAnalytics])

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
  const recentEntries = todayEntries.slice(0, 5).reverse()
  const activeAnnouncement = announcements[0]
  const showAnnouncementSection = announcementsLoading || Boolean(activeAnnouncement)

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="space-y-1 sm:space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening today</p>
          </div>
          {user.isAdmin && (
            <Button
              onClick={() => setShowCreateAnnouncement(!showCreateAnnouncement)}
              variant="outline"
              size="sm"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              {showCreateAnnouncement ? 'Cancel' : 'New Announcement'}
            </Button>
          )}
        </div>
      </header>

      {/* Create Announcement Modal (Admin Only) */}
      {user.isAdmin && (
        <CreateAnnouncementForm
          open={showCreateAnnouncement}
          onClose={() => setShowCreateAnnouncement(false)}
          onSuccess={() => {
            fetchAnnouncements(true)
          }}
        />
      )}

      {/* Announcements Section */}
      {showAnnouncementSection && (
        <div className="space-y-3">
          {announcementsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            activeAnnouncement && (
              <AnnouncementCard
                key={activeAnnouncement.id}
                announcement={activeAnnouncement}
                onDelete={() => fetchAnnouncements(true)}
              />
            )
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Today's Time</CardDescription>
            <CardTitle className="text-2xl">
              {formatDuration(todayTotalMinutes)}
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
            <CardDescription>Total Boards</CardDescription>
            <CardTitle className="text-2xl">
              {boardsLoading ? '...' : boards.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/workspace">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {analytics && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Billable Hours</CardDescription>
                <CardTitle className="text-2xl">
                  {Math.round(analytics.billableHours * 10) / 10}h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Entries</CardDescription>
                <CardTitle className="text-2xl">{analytics.totalEntries}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Active Timer */}
      {activeTimer && activeTimer.isActive && (
        <Card className="border-primary/50 bg-primary/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock4 className="h-5 w-5 text-primary" />
                <CardTitle>Active Timer</CardTitle>
              </div>
              {activeTimer.isPaused && (
                <Badge variant="secondary">Paused</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{timerDuration}</p>
                <p className="text-sm text-muted-foreground mt-1">{activeTimer.task}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTimer.projects.map((project) => (
                  <Badge key={project} variant="secondary">
                    {project}
                  </Badge>
                ))}
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/time-tracker">View Timer</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
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
          <CardContent>
            {boardsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentBoards.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No boards yet. Create your first workspace!</p>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock4 className="h-5 w-5 text-primary" />
                <CardTitle>Recent Time Entries</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/time-tracker">
                  View All <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No time entries today yet.</p>
                <Button asChild variant="outline">
                  <Link to="/time-tracker">
                    <Play className="mr-2 h-4 w-4" />
                    Start Timer
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between p-2 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.task}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {entry.projects.join(', ')}
                        </p>
                        <Badge variant={entry.status === 'Billable' ? 'default' : 'secondary'} className="text-xs">
                          {entry.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm font-medium ml-4">
                      {formatDuration(entry.duration)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <Button asChild size="lg" className="h-auto py-6">
          <Link to="/workspace">
            <Kanban className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Go to Workspace</div>
              <div className="text-sm font-normal opacity-90">Manage boards and tasks</div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto py-6">
          <Link to="/time-tracker">
            <Clock4 className="mr-2 h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Time Tracker</div>
              <div className="text-sm font-normal opacity-90">Track your work hours</div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
