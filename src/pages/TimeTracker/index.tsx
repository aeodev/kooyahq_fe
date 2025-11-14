import { useState, useEffect, useMemo } from 'react'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useAuthStore } from '@/stores/auth.store'
import { useTimeEntries, useTimerDuration } from '@/hooks/time-entry.hooks'
import { useProjects } from '@/hooks/project.hooks'
import type { TimeEntry } from '@/types/time-entry'
import { ActiveTimerCard } from './components/ActiveTimerCard'
import { StartTimerForm } from './components/StartTimerForm'
import { QuickActions } from './components/QuickActions'
import { TodaySummary } from './components/TodaySummary'
import { EntryList } from './components/EntryList'
import { AllTeamView } from './components/AllTeamView'
import { AnalyticsView } from './components/AnalyticsView'
import { ManualEntryModal } from './components/ManualEntryModal'
import { STOP_TIMER, BASE_URL, GET_USERS } from '@/utils/api.routes'
import axiosInstance from '@/utils/axios.instance'
import type { User } from '@/types/user'

type TabType = 'you' | 'all' | 'analytics'

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return ''
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function TimeTracker() {
  const [activeTab, setActiveTab] = useState<TabType>('you')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [taskDescription, setTaskDescription] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)

  const { data: allEntries, fetchEntries } = useTimeEntries()
  const { data: projectsData, fetchProjects } = useProjects()
  
  // Convert projects to array of names for compatibility
  const projects = useMemo(() => {
    return projectsData?.map((p) => p.name) || []
  }, [projectsData])

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])
  const myEntries = useTimeEntryStore((state) => state.entries)
  const fetchMyEntries = useTimeEntryStore((state) => state.fetchEntries)
  const activeTimer = useTimeEntryStore((state) => state.activeTimer)
  const fetchActiveTimer = useTimeEntryStore((state) => state.fetchActiveTimer)
  const startTimer = useTimeEntryStore((state) => state.startTimer)
  const pauseTimer = useTimeEntryStore((state) => state.pauseTimer)
  const resumeTimer = useTimeEntryStore((state) => state.resumeTimer)
  const stopTimer = useTimeEntryStore((state) => state.stopTimer)
  const endDay = useTimeEntryStore((state) => state.endDay)
  const logManualEntry = useTimeEntryStore((state) => state.logManualEntry)
  const timerDuration = useTimerDuration(activeTimer)
  
  const [loggingManual, setLoggingManual] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; position?: string; profilePic?: string }>>([])

  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const token = useAuthStore((state) => state.token)
  
  // Initial fetch - only when user is authenticated and auth is ready
  useEffect(() => {
    if (user && !isLoading) {
      fetchMyEntries()
      fetchActiveTimer()
    }
  }, [user, isLoading, fetchMyEntries, fetchActiveTimer])

  // Fetch users for position and profile data
  useEffect(() => {
    if (user && !isLoading && activeTab === 'all') {
      axiosInstance.get<{ status: string; data: User[] }>(GET_USERS())
        .then((response) => {
          setUsers(response.data.data.map((u) => ({ id: u.id, position: u.position, profilePic: u.profilePic })))
        })
        .catch(() => {
          // Silently fail - position is optional
        })
    }
  }, [user, isLoading, activeTab])

  // Fetch immediately when switching to "All" tab
  useEffect(() => {
    if (activeTab === 'all' && user && !isLoading) {
      fetchEntries()
    }
  }, [activeTab, user, isLoading, fetchEntries])

  // Socket handles real-time updates, no need for polling

  const handleProjectSelection = (projects: string[]) => {
    setSelectedProjects(projects)
  }

  const handleStart = async () => {
    if (selectedProjects.length === 0 || !taskDescription.trim()) return
    
    const result = await startTimer({
      projects: selectedProjects,
      task: taskDescription.trim(),
      status: 'Billable',
    })

    if (result) {
      setTaskDescription('')
      setSelectedProjects([])
      // Timer and entries are automatically updated in store
    }
  }

  const handleStop = async () => {
    await stopTimer()
    // Timer and entries are automatically updated in store
  }

  const handlePause = async () => {
    if (activeTimer && !activeTimer.isPaused) {
      await pauseTimer()
      // Timer is automatically updated in store
    }
  }

  const handleResume = async () => {
    if (activeTimer && activeTimer.isPaused) {
      await resumeTimer()
      // Timer is automatically updated in store
    }
  }

  const handleEndDay = async () => {
    await endDay()
    fetchEntries() // Still need to fetch all entries for analytics
    // Timer and my entries are automatically updated in store
  }

  const handleAddManualEntry = async (data: { projects: string[]; task: string; hours: number; minutes: number }) => {
    const totalMinutes = data.hours * 60 + data.minutes
    
    setLoggingManual(true)
    const result = await logManualEntry({
      projects: data.projects,
      task: data.task,
      duration: totalMinutes,
      status: 'Billable',
    })
    setLoggingManual(false)

    if (result) {
      setShowManualModal(false)
      fetchEntries() // Still need to fetch all entries for analytics
      // Entry is automatically added to store
    }
  }

  // Calculate today's totals
  const todayMyEntries = myEntries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  const todayTotalMinutes = todayMyEntries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      return sum + Math.floor(diffMs / 60000)
    }
    return sum + entry.duration
  }, 0)

  const todayTotal = formatDuration(todayTotalMinutes)

  // Transform entries for display
  const displayEntries = todayMyEntries.map((entry) => ({
    id: entry.id,
    project: entry.projects.join(', '),
    task: entry.task,
    duration: formatDuration(entry.duration),
    status: entry.status as 'Billable' | 'Internal',
    time: formatTimeRange(entry.startTime, entry.endTime),
  }))

  // Calculate analytics data
  const allTodayEntries = allEntries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  // Force re-render every second to update timer displays
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Stop timer on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only stop if there's an active timer that's not paused
      if (activeTimer && activeTimer.isActive && !activeTimer.isPaused && token) {
        // Use fetch with keepalive to ensure request completes during page unload
        const stopTimerUrl = `${BASE_URL}${STOP_TIMER()}`
        fetch(stopTimerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          keepalive: true, // Critical: ensures request completes even after page unloads
        }).catch(() => {
          // Silently fail - browser is closing anyway
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [activeTimer, token])

  // Helper function to calculate duration for an active timer entry
  const calculateActiveDuration = (entry: TimeEntry): string => {
    if (!entry.isActive || !entry.startTime) {
      return '00:00'
    }

    const start = new Date(entry.startTime)
    
    // Calculate total elapsed time
    let elapsedMs = now.getTime() - start.getTime()
    
    // Subtract paused duration (accumulated paused time)
    const pausedMs = (entry.pausedDuration || 0) * 60000
    elapsedMs -= pausedMs
    
    // If currently paused, subtract current pause time
    if (entry.isPaused && entry.lastPausedAt) {
      const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime()
      elapsedMs -= currentPauseMs
    }
    
    // Calculate seconds
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    // Format duration
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  }

  const teamMembers = useMemo(() => {
    // Create team members map from entries
    const membersMap = new Map<string, TimeEntry[]>()
    allTodayEntries.forEach((entry) => {
      const existing = membersMap.get(entry.userId) || []
      existing.push(entry)
      membersMap.set(entry.userId, existing)
    })

    return Array.from(membersMap.entries()).map(([userId, entries]) => {
      const firstEntry = entries[0]
      const activeEntry = entries.find(e => e.isActive)
      const totalMinutes = entries.reduce((sum, e) => {
        if (e.isActive && e.startTime) {
          const start = new Date(e.startTime)
          let elapsedMs = now.getTime() - start.getTime()
          const pausedMs = (e.pausedDuration || 0) * 60000
          elapsedMs -= pausedMs
          if (e.isPaused && e.lastPausedAt) {
            const currentPauseMs = now.getTime() - new Date(e.lastPausedAt).getTime()
            elapsedMs -= currentPauseMs
          }
          return sum + Math.max(0, Math.floor(elapsedMs / 60000))
        }
        return sum + e.duration
      }, 0)

      const userData = users.find((u) => u.id === userId)

      return {
        id: userId,
        name: firstEntry.userName,
        email: firstEntry.userEmail,
        position: userData?.position,
        profilePic: userData?.profilePic,
        status: activeEntry ? ('active' as const) : ('inactive' as const),
        todayHours: formatDuration(totalMinutes),
        activeTimer: activeEntry ? {
          duration: userId === user?.id ? timerDuration : calculateActiveDuration(activeEntry),
          projects: activeEntry.projects,
          task: activeEntry.task,
        } : undefined,
        entries: entries.slice(0, 3).map((e) => ({
          id: e.id,
          project: e.projects.join(', '),
          task: e.task,
          duration: formatDuration(e.duration),
          time: formatTimeRange(e.startTime, e.endTime),
        })),
      }
    })
  }, [allTodayEntries, now, timerDuration, user?.id, users])

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Time Tracker</h1>
        <p className="text-base font-normal text-muted-foreground leading-6">Track your work time across multiple projects</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        <button
          onClick={() => setActiveTab('you')}
          className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
            activeTab === 'you'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          You
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'you' && (
        <div className="space-y-6">
          {/* Active Timer Card */}
          {activeTimer && (
            <ActiveTimerCard
              duration={timerDuration}
              projects={activeTimer.projects}
              task={activeTimer.task}
              isPaused={activeTimer.isPaused}
              onStop={handleStop}
            />
          )}

          {/* Start Timer Section */}
          {!activeTimer && (
            <div className="space-y-6">
              <StartTimerForm
                projects={projects}
                selectedProjects={selectedProjects}
                taskDescription={taskDescription}
                onSelectionChange={handleProjectSelection}
                onTaskChange={setTaskDescription}
                onStart={handleStart}
              />

              {/* Quick Actions */}
              <QuickActions
                isTimerRunning={!!activeTimer}
                isPaused={activeTimer?.isPaused || false}
                onPause={handlePause}
                onResume={handleResume}
                onAdd={() => setShowManualModal(true)}
                onEndDay={handleEndDay}
              />
            </div>
          )}

          {/* Quick Actions - Show when timer is running */}
          {activeTimer && (
            <QuickActions
              isTimerRunning={!!activeTimer}
              isPaused={activeTimer?.isPaused || false}
              onPause={handlePause}
              onResume={handleResume}
              onAdd={() => setShowManualModal(true)}
              onEndDay={handleEndDay}
            />
          )}

          {/* Manual Entry Modal */}
          <ManualEntryModal
            projects={projects}
            open={showManualModal}
            onClose={() => setShowManualModal(false)}
            onSubmit={handleAddManualEntry}
            loading={loggingManual}
          />

          {/* Today's Summary */}
          <TodaySummary totalHours={todayTotal} entryCount={todayMyEntries.length} />

          {/* Today's Activity */}
          <EntryList entries={displayEntries} />
        </div>
      )}

      {activeTab === 'all' && (
        <AllTeamView
          members={teamMembers}
          totalTeamHours={formatDuration(
            allTodayEntries.reduce((sum, e) => {
              if (e.isActive && e.startTime) {
                const start = new Date(e.startTime)
                const now = new Date()
                return sum + Math.floor((now.getTime() - start.getTime()) / 60000)
              }
              return sum + e.duration
            }, 0)
          )}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsView />
      )}
    </section>
  )
}
