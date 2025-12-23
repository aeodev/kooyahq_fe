import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useHomeData } from './hooks/useHomeData'
import { HeroSection } from './components/HeroSection'
import { ActivityFeed } from './components/ActivityFeed'
import { TeamWidget, NewsWidget, NotificationsWidget } from './components/SideWidgets'
import { CreateAnnouncementForm } from '@/components/announcements/CreateAnnouncementForm'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export function Home() {
  const { user, permissions, data, isLoading } = useHomeData()
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)

  if (!user) return null

  // Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const activeAnnouncement = data.announcements[0]

  if (isLoading && !data.activeTimer && data.todayEntries.length === 0) {
     return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 animate-pulse">
           <div className="h-8 w-48 bg-muted rounded" />
           <div className="h-64 w-full bg-muted rounded-2xl" />
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
              <div className="h-64 bg-muted rounded-xl" />
           </div>
        </div>
     )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
             Here's what's happening today.
          </p>
        </div>
        
        {permissions.canManageAnnouncements && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCreateAnnouncement(true)}
            className="gap-2"
          >
            <Megaphone className="h-4 w-4" />
            New Announcement
          </Button>
        )}
      </header>

      {/* Announcements / Notifications */}
      <div className="space-y-4">
          {permissions.canManageAnnouncements && (
            <CreateAnnouncementForm
              open={showCreateAnnouncement}
              onClose={() => setShowCreateAnnouncement(false)}
              onSuccess={() => window.location.reload()} // Simple reload to refresh or use context in future
            />
          )}

          {activeAnnouncement && (
            <AnnouncementCard 
                announcement={activeAnnouncement} 
                onDelete={() => window.location.reload()} 
            />
          )}
          
          {permissions.canReadNotifications && (
              <NotificationsWidget unreadCount={data.unreadCount} />
          )}
      </div>

      {/* Hero Timer */}
      {permissions.canReadTimeEntries && (
        <section>
           <HeroSection 
              activeTimer={data.activeTimer} 
              analytics={data.analytics}
              canViewAnalytics={permissions.canViewTimeAnalytics}
           />
        </section>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Activity) */}
        <div className="lg:col-span-2 space-y-6">
           {permissions.canReadTimeEntries && (
              <ActivityFeed 
                entries={data.todayEntries}
                todayTotalMinutes={data.todayTotalMinutes}
              />
           )}
        </div>

        {/* Right Column (Widgets) */}
        <div className="space-y-6">
           {permissions.canViewPresence && (
              <TeamWidget 
                activeUsers={data.activeUsers} 
                totalUsers={data.totalUsersCount} 
              />
           )}
           
           {permissions.canViewAINews && (
              <NewsWidget news={data.latestNews} />
           )}
        </div>
      </div>
    </div>
  )
}

