import { useState, useMemo } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { ThemeSettingsSection } from './components/ThemeSettingsSection'
import { Settings } from 'lucide-react'

type TabType = 'theme'

export function SystemManagement() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const [activeTab, setActiveTab] = useState<TabType>('theme')
  const hasSystemAccess = useMemo(
    () => can(PERMISSIONS.SYSTEM_FULL_ACCESS),
    [can]
  )

  if (!user || !hasSystemAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need system full access permissions to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">System Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage system-wide settings and configurations</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
            activeTab === 'theme'
              ? 'bg-primary/10 text-primary border border-primary/50 shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
          }`}
        >
          <Settings className="h-4 w-4 inline-block mr-2" />
          Theme Settings
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'theme' && <ThemeSettingsSection />}
      </div>
    </section>
  )
}

