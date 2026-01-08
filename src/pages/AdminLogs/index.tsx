import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { ActivityLogSection } from '@/pages/UserManagement/components/ActivityLogSection'

export function AdminLogs() {
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const canViewLogs = can(PERMISSIONS.SYSTEM_LOGS)

  if (!user || !canViewLogs) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin log permissions to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="space-y-1 sm:space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Management</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Admin Logs</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track administrative changes across users, projects, servers, and system settings.
        </p>
      </header>

      <ActivityLogSection canViewActivity={canViewLogs} />
    </section>
  )
}
