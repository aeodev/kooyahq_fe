import { useEffect, useMemo, useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { UsersSection } from './components/UsersSection'
import { ProjectsSection } from './components/ProjectsSection'
import { DashboardSection } from './components/DashboardSection'
import { ActivityLogSection } from './components/ActivityLogSection'
import { PERMISSIONS } from '@/constants/permissions'

type TabType = 'dashboard' | 'users' | 'projects' | 'activity'

export function UserManagement() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const canViewUsers = useMemo(
    () => can(PERMISSIONS.USERS_VIEW) || can(PERMISSIONS.USERS_MANAGE),
    [can]
  )
  const canManageUsers = useMemo(() => can(PERMISSIONS.USERS_MANAGE), [can])
  const canViewProjects = useMemo(
    () => can(PERMISSIONS.PROJECTS_VIEW) || can(PERMISSIONS.PROJECTS_MANAGE),
    [can]
  )
  const canManageProjects = useMemo(() => can(PERMISSIONS.PROJECTS_MANAGE), [can])
  const canViewActivity = useMemo(
    () => can(PERMISSIONS.SYSTEM_LOGS),
    [can]
  )
  const canAccessUserManagement = useMemo(
    () => canViewUsers || canViewProjects || canViewActivity,
    [canViewUsers, canViewProjects, canViewActivity]
  )

  const availableTabs: TabType[] = useMemo(() => {
    const tabs: TabType[] = ['dashboard']
    if (canViewUsers) tabs.push('users')
    if (canViewProjects) tabs.push('projects')
    if (canViewActivity) tabs.push('activity')
    return tabs
  }, [canViewUsers, canViewProjects, canViewActivity])

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? 'dashboard')
    }
  }, [activeTab, availableTabs])

  if (!user || !canAccessUserManagement) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need user management permissions to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage users, projects, and audit logs</p>
      </header>

      {/* Tabs - Mobile-first with horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          Dashboard
        </button>
        {canViewUsers && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
            }`}
          >
            Users
          </button>
        )}
        {canViewProjects && (
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
            }`}
          >
            Projects
          </button>
        )}
        {canViewActivity && (
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
            }`}
          >
            Activity Log
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <DashboardSection
            canViewUsers={canViewUsers}
            canViewProjects={canViewProjects}
            canViewActivity={canViewActivity}
          />
        )}
        {activeTab === 'users' && canViewUsers && (
          <UsersSection canManageUsers={canManageUsers} canViewUsers={canViewUsers} />
        )}
        {activeTab === 'projects' && canViewProjects && (
          <ProjectsSection canManageProjects={canManageProjects} canViewProjects={canViewProjects} />
        )}
        {activeTab === 'activity' && canViewActivity && <ActivityLogSection canViewActivity={canViewActivity} />}
        {!availableTabs.includes(activeTab) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Access limited</CardTitle>
              <CardDescription>You do not have permission to view this section.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </section>
  )
}
