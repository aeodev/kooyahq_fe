import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, CalendarDays, Timer, ArrowUpRight, PlayCircle, Ticket } from 'lucide-react'
import { useHomeData } from './hooks/useHomeData'
import { HeroSection } from './components/HeroSection'
import { AssignedTicketsWidget } from './components/SideWidgets'
import { QuickTasks } from '@/components/quick-tasks/QuickTasks'
import { CreateAnnouncementForm } from '@/components/announcements/CreateAnnouncementForm'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { Button } from '@/components/ui/button'
import { ActiveUsersSection } from '@/components/layout/components/ActiveUsersSection'
import { cn } from '@/utils/cn'
import { Link } from 'react-router-dom'

// Ambient mesh gradient background
function AmbientMesh() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary gradient orb */}
      <div 
        className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full opacity-[0.07] dark:opacity-[0.04] blur-[120px]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />
      {/* Secondary accent orb */}
      <div 
        className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[70%] rounded-full opacity-[0.05] dark:opacity-[0.03] blur-[100px]"
        style={{ background: 'radial-gradient(circle, hsl(142 70% 60%) 0%, transparent 70%)' }}
      />
      {/* Subtle noise overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  )
}

// Stat card component
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: string
  delay?: number
  secondaryValue?: string | number
  secondaryLabel?: string
}

function StatCard({ icon, label, value, accent = 'primary', delay = 0, secondaryValue, secondaryLabel }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md hover:bg-card/70 dark:hover:bg-card/40 transition-all duration-300"
    >
      <div 
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: `hsl(var(--${accent}) / 0.1)` }}
      >
        <span style={{ color: `hsl(var(--${accent}))` }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          </div>
          {secondaryValue !== undefined && secondaryLabel && (
            <div className="ml-auto">
              <p className="text-xl font-bold tracking-tight tabular-nums">{secondaryValue}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{secondaryLabel}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Format total time from minutes
function formatTotalTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// Calculate elapsed minutes from a timer (accounts for paused time)
function getElapsedMinutes(timer: { startTime: Date | string; pausedDuration?: number | null; isPaused?: boolean | null; lastPausedAt?: Date | string | null }): number {
  const start = new Date(timer.startTime).getTime()
  const now = Date.now()
  
  let elapsedMs = now - start
  const pausedMs = timer.pausedDuration || 0
  elapsedMs -= pausedMs

  // If currently paused, subtract the current pause duration
  if (timer.isPaused && timer.lastPausedAt) {
    const currentPauseMs = now - new Date(timer.lastPausedAt).getTime()
    elapsedMs -= currentPauseMs
  }

  return Math.max(0, elapsedMs / 1000 / 60)
}

export function Home() {
  const { user, permissions, data, isLoading, refetchAnnouncements } = useHomeData()
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)
  const [, setTick] = useState(0) // Force re-render every minute for live stats

  // Update stats every second to keep active timer time in sync with HeroSection timer
  useEffect(() => {
    if (!data.activeTimer?.isActive) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [data.activeTimer?.isActive])

  if (!user) return null

  // Date formatting
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const greeting = getGreeting()

  const activeAnnouncement = data.announcements[0]
  
  // Calculate stats - INCLUDE active timer elapsed time
  const completedTime = data.todayEntries
    .filter(e => !e.isActive)
    .reduce((acc, entry) => acc + (entry.duration || 0), 0)
  
  const activeElapsed = (data.activeTimer?.isActive && data.activeTimer?.startTime)
    ? getElapsedMinutes({ ...data.activeTimer, startTime: data.activeTimer.startTime }) 
    : 0
  
  const totalTimeToday = completedTime + activeElapsed
  const activeTickets = data.assignedTickets.length

  // Bento card base styles
  const bentoBase = "!border border-border/30 bg-card/40 dark:bg-card/25 backdrop-blur-xl shadow-lg shadow-black/[0.03] dark:shadow-black/20 rounded-2xl hover:shadow-xl hover:border-border/50 transition-all duration-500"

  if (isLoading && !data.activeTimer && data.todayEntries.length === 0) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <AmbientMesh />
        <div className="container mx-auto px-4 md:px-8 py-8 space-y-8 max-w-7xl animate-pulse">
          <div className="space-y-2">
            <div className="h-10 w-72 bg-muted/30 rounded-xl" />
            <div className="h-5 w-48 bg-muted/20 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/20 rounded-2xl" />
            ))}
          </div>
          <div className="h-48 bg-muted/20 rounded-2xl" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80 bg-muted/20 rounded-2xl" />
            <div className="h-80 bg-muted/20 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <AmbientMesh />
      
      <div className="container mx-auto px-4 md:px-8 py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {greeting}, <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">{user.name.split(' ')[0]}</span>
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
          </div>
          
          {permissions.canManageAnnouncements && (
            <>
              <Button 
                size="sm"
                onClick={() => setShowCreateAnnouncement(true)}
                className="gap-2 rounded-xl shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                <Megaphone className="h-4 w-4" />
                New Announcement
              </Button>
              <CreateAnnouncementForm
                open={showCreateAnnouncement}
                onClose={() => setShowCreateAnnouncement(false)}
                onSuccess={refetchAnnouncements}
              />
            </>
          )}
        </motion.header>

        {/* Stats Row - Desktop: 3 stat cards */}
        <div className="hidden sm:grid grid-cols-3 gap-4">
        {permissions.canReadTimeEntries && (
            <StatCard 
              icon={<Timer className="h-5 w-5" />}
              label="Tracked Today"
              value={formatTotalTime(totalTimeToday)}
              accent="primary"
              delay={0.1}
            />
          )}
          
          {permissions.canReadTimeEntries && (
            <StatCard 
              icon={<PlayCircle className="h-5 w-5" />}
              label="Sessions"
              value={data.todayEntries.length}
              accent="chart-2"
              delay={0.15}
            />
          )}
          
          {permissions.canReadBoards && (
            <StatCard 
              icon={<Ticket className="h-5 w-5" />}
              label="Active Tickets"
              value={activeTickets}
              accent="chart-3"
              delay={0.2}
            />
          )}
        </div>

        {/* Active Users Section - Mobile Only (desktop has it in sidebar) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={cn(
            "block sm:hidden rounded-2xl bg-card/50 dark:bg-card/30 border border-border/40 backdrop-blur-md hover:bg-card/70 dark:hover:bg-card/40 transition-all duration-300",
            bentoBase
          )}
          style={{ height: '96px' }}
        >
          <div className="p-4 h-full flex items-center gap-4">
            <div className="flex-1 min-w-0 overflow-hidden">
              <ActiveUsersSection collapsed={false} />
            </div>
            <Link 
              to="/time-tracker?tab=all"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-muted/50 hover:scale-110"
            >
              <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Link>
          </div>
        </motion.div>

        {/* Announcements */}
        {activeAnnouncement && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <AnnouncementCard 
              announcement={activeAnnouncement} 
              onDelete={refetchAnnouncements} 
            />
          </motion.section>
        )}

        {/* Time Tracking Hero */}
        {permissions.canReadTimeEntries && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <HeroSection 
              activeTimer={data.activeTimer ?? null} 
              todayEntries={data.todayEntries}
              className={bentoBase}
            />
          </motion.div>
        )}

        {/* Bottom Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets */}
          {permissions.canReadBoards && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <AssignedTicketsWidget 
                tickets={data.assignedTickets} 
                className={bentoBase}
              />
            </motion.div>
          )}

          {/* Quick Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <QuickTasks className={bentoBase} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
