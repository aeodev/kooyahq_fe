import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { EmployeesSection } from './components/EmployeesSection'
import { ProjectsSection } from './components/ProjectsSection'

type TabType = 'employees' | 'projects'

export function Admin() {
  const user = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState<TabType>('employees')

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage employees and projects</p>
      </header>

      {/* Tabs - Mobile-first with horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          Employees
        </button>
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
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'employees' && <EmployeesSection />}
        {activeTab === 'projects' && <ProjectsSection />}
      </div>
    </section>
  )
}

