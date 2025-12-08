import { useState, useEffect, useMemo } from 'react'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useAuthStore } from '@/stores/auth.store'
import { useProjectTaskStore } from '@/stores/project-task.store'
import { useTimerDuration } from '@/hooks/time-entry.hooks'
import { useTeamUsers } from '@/hooks/user.hooks'
import { useProjects } from '@/hooks/project.hooks'
import { ActiveTimerCard } from './components/ActiveTimerCard'
import { StartTimerForm } from './components/StartTimerForm'
import { QuickActions } from './components/QuickActions'
import { TodaySummary } from './components/TodaySummary'
import { EntryList } from './components/EntryList'
import { AllTeamView } from './components/AllTeamView'
import { AnalyticsView } from './components/AnalyticsView'
import { ManualEntryModal } from './components/ManualEntryModal'
import { EndDayModal } from './components/EndDayModal'
import { OvertimeConfirmationModal } from './components/OvertimeConfirmationModal'
import { formatDuration, formatTimeRange } from './components/utils'
import { transformEntriesToTeamMembers } from './components/team-utils'

type TabType = 'you' | 'all' | 'analytics'

export function TimeTracker() {
  const [activeTab, setActiveTab] = useState<TabType>('you')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [taskDescription, setTaskDescription] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [showEndDayModal, setShowEndDayModal] = useState(false)
  const [showOvertimeModal, setShowOvertimeModal] = useState(false)
  const [dayEndedToday, setDayEndedToday] = useState(false)
  const [pendingTimerStart, setPendingTimerStart] = useState<(() => void) | null>(null)
  const [pendingManualEntryData, setPendingManualEntryData] = useState<{ projects: string[]; task: string; hours: number; minutes: number } | null>(null)

  const {
    projectTasks,
    setProjectTask,
    resetProjectTask,
    clearAll,
    getProjectTask,
  } = useProjectTaskStore()

  const allEntries = useTimeEntryStore((state) => state.allTodayEntries)
  const fetchAllEntries = useTimeEntryStore((state) => state.fetchAllTodayEntries)
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
  const addTaskToTimer = useTimeEntryStore((state) => state.addTaskToTimer)
  const pauseTimer = useTimeEntryStore((state) => state.pauseTimer)
  const resumeTimer = useTimeEntryStore((state) => state.resumeTimer)
  const stopTimer = useTimeEntryStore((state) => state.stopTimer)
  const endDay = useTimeEntryStore((state) => state.endDay)
  const checkDayEndedStatus = useTimeEntryStore((state) => state.checkDayEndedStatus)
  const logManualEntry = useTimeEntryStore((state) => state.logManualEntry)
  const timerDuration = useTimerDuration(activeTimer)
  
  const [loggingManual, setLoggingManual] = useState(false)
  const { users, fetchUsers } = useTeamUsers()

  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  
  // Initial fetch - only when user is authenticated and auth is ready
  useEffect(() => {
    if (user && !isLoading) {
      fetchMyEntries()
      fetchActiveTimer()
      checkDayEndedStatus().then((status) => {
        setDayEndedToday(status.dayEnded)
      })
    }
  }, [user, isLoading, fetchMyEntries, fetchActiveTimer, checkDayEndedStatus])


  // Fetch users for position and profile data
  useEffect(() => {
    if (user && !isLoading && activeTab === 'all') {
      fetchUsers()
    }
  }, [user, isLoading, activeTab, fetchUsers])

  // Fetch immediately when switching to "All" tab
  useEffect(() => {
    if (activeTab === 'all' && user && !isLoading) {
      fetchAllEntries()
    }
  }, [activeTab, user, isLoading, fetchAllEntries])

  // Socket handles real-time updates, no need for polling

  const handleProjectSelection = (projects: string[]) => {
    setSelectedProjects(projects)
    if (projects.length > 0) {
      setActiveProject(projects[0])
    } else {
      setActiveProject(null)
    }
    projectTasks.forEach((_, project) => {
      if (!projects.includes(project)) {
        resetProjectTask(project)
      }
    })
  }

  const handleStart = async () => {
    if (selectedProjects.length === 0) return
    if (activeTimer) return // Don't start if already running
    const projectToStart = activeProject || selectedProjects[0]
    if (!projectToStart) return
    const taskForProject = getProjectTask(projectToStart) || taskDescription.trim()
    if (!taskForProject.trim()) return
    
    // Check if day was ended
    if (dayEndedToday) {
      setPendingTimerStart(() => async () => {
        setProjectTask(projectToStart, taskForProject.trim())
        const result = await startTimer({
          projects: [projectToStart],
          task: taskForProject.trim(),
          isOvertime: true,
        })
        if (result) {
          setTaskDescription('')
          setDayEndedToday(false) // Allow End Day button to reappear
        }
      })
      setShowOvertimeModal(true)
      return
    }
    
    // Save task to store before starting
    setProjectTask(projectToStart, taskForProject.trim())
    
    const result = await startTimer({
      projects: [projectToStart],
      task: taskForProject.trim(),
    })
    if (result) {
      setTaskDescription('')
    }
  }

  const handleSwitchProject = async (newProject: string) => {
    if (!activeTimer || !selectedProjects.includes(newProject)) return
    
    // Don't switch if already on this project
    if (newProject === activeProject) return

    const previousProject = activeProject

    // Stop current timer (saves time entry for current project)
    await stopTimer()

    // Switch to new project
    setActiveProject(newProject)

    // Get the preset task for the new project (keep it if switching to a fresh project)
    const presetTask = getProjectTask(newProject) || ''

    // Start new timer with the preset task
    await startTimer({
      projects: [newProject],
      task: presetTask,
    })
    
    // Clear the task for the previous project since it was already logged
    if (previousProject) {
      resetProjectTask(previousProject)
    }
  }

  const handleQuickAddTask = async (task: string) => {
    if (!activeTimer || !task.trim()) return
    // Use the new backend endpoint to add task with timestamp
    await addTaskToTimer(task.trim())
    // Refresh entries to get updated task in activity log
    await fetchMyEntries()
  }

  const handleStop = async () => {
    await stopTimer()
    setSelectedProjects([])
    setActiveProject(null)
    clearAll()
    setTaskDescription('')
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
    }
  }

  const handleEndDay = () => {
    setShowEndDayModal(true)
  }

  const handleEndDaySubmit = async () => {
    await endDay()
    setShowEndDayModal(false)
    setDayEndedToday(true)
    fetchAllEntries() // Still need to fetch all entries for analytics

  }

  const handleAddManualEntry = async (data: { projects: string[]; task: string; hours: number; minutes: number }) => {
    // Check if day was ended
    if (dayEndedToday) {
      setPendingManualEntryData(data)
      setShowOvertimeModal(true)
      return
    }

    const totalMinutes = data.hours * 60 + data.minutes
    
    setLoggingManual(true)
    const result = await logManualEntry({
      projects: data.projects,
      task: data.task,
      duration: totalMinutes,
    })
    setLoggingManual(false)

    if (result) {
      setShowManualModal(false)
      fetchAllEntries()
    }
  }

  // Calculate today's totals
  const todayMyEntries = myEntries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  // Check if there are overtime entries
  const hasOvertimeEntries = todayMyEntries.some((entry) => entry.isOvertime)

  // Show End Day button if day hasn't been ended, or if there are overtime entries
  const showEndDayButton = !dayEndedToday || hasOvertimeEntries

  const handleOvertimeConfirm = async () => {
    setShowOvertimeModal(false)
    if (pendingTimerStart) {
      pendingTimerStart()
      setPendingTimerStart(null)
    } else if (pendingManualEntryData) {
      const data = pendingManualEntryData
      const totalMinutes = data.hours * 60 + data.minutes
      setLoggingManual(true)
      const result = await logManualEntry({
        projects: data.projects,
        task: data.task,
        duration: totalMinutes,
        isOvertime: true,
      })
      setLoggingManual(false)

      if (result) {
        setShowManualModal(false)
        setDayEndedToday(false)
        fetchAllEntries() 
      }
      setPendingManualEntryData(null)
    }
  }

  const handleOvertimeCancel = () => {
    setShowOvertimeModal(false)
    setPendingTimerStart(null)
    setPendingManualEntryData(null)
  }

  const todayTotalMinutes = todayMyEntries.reduce((sum, entry) => {
    if (entry.isActive && entry.startTime) {
      const start = new Date(entry.startTime)
      const now = new Date()
      let diffMs = now.getTime() - start.getTime()
      // Subtract paused duration
      diffMs -= entry.pausedDuration || 0
      // If currently paused, subtract current pause time too
      if (entry.isPaused && entry.lastPausedAt) {
        diffMs -= now.getTime() - new Date(entry.lastPausedAt).getTime()
      }
      return sum + Math.max(0, Math.floor(diffMs / 60000))
    }
    return sum + entry.duration
  }, 0)

  const todayTotal = formatDuration(todayTotalMinutes)

  // Transform entries for display
  const displayEntries = todayMyEntries.map((entry) => ({
    id: entry.id,
    project: entry.projects.join(', '),
    tasks: entry.tasks || [],
    duration: formatDuration(entry.duration),
    time: formatTimeRange(entry.startTime, entry.endTime),
    isOvertime: entry.isOvertime,
    isActive: entry.isActive,
  }))

  // Calculate analytics data
  const allTodayEntries = allEntries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  // Only update time when on "All" tab to avoid unnecessary re-renders
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    if (activeTab !== 'all') return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [activeTab])

  const teamMembers = useMemo(() => {
    return transformEntriesToTeamMembers(allTodayEntries, users, user?.id, timerDuration, now)
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
              tasks={activeTimer.tasks || []}
              isPaused={activeTimer.isPaused}
              onStop={handleStop}
              selectedProjects={selectedProjects}
              activeProject={activeProject || activeTimer.projects[0]}
              onSwitchProject={handleSwitchProject}
              onQuickAddTask={handleQuickAddTask}
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
                projectTasks={projectTasks}
                onSetProjectTask={setProjectTask}
                activeProject={activeProject}
              />

              {/* Quick Actions */}
              <QuickActions
                isTimerRunning={false}
                isPaused={false}
                onPause={handlePause}
                onResume={handleResume}
                onAdd={() => setShowManualModal(true)}
                onEndDay={handleEndDay}
                showEndDay={showEndDayButton}
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
              showEndDay={showEndDayButton}
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

          {/* End Day Modal */}
          <EndDayModal
            open={showEndDayModal}
            onClose={() => setShowEndDayModal(false)}
            onSubmit={handleEndDaySubmit}
            entries={todayMyEntries}
            loading={false}
          />

          {/* Overtime Confirmation Modal */}
          <OvertimeConfirmationModal
            open={showOvertimeModal}
            onClose={handleOvertimeCancel}
            onConfirm={handleOvertimeConfirm}
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
                let diffMs = now.getTime() - start.getTime()
                diffMs -= e.pausedDuration || 0
                if (e.isPaused && e.lastPausedAt) {
                  diffMs -= now.getTime() - new Date(e.lastPausedAt).getTime()
                }
                return sum + Math.max(0, Math.floor(diffMs / 60000))
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
