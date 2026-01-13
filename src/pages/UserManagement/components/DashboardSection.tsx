import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useUserManagementStats } from '@/hooks/user-management.hooks'
import { Users, Shield, UserCheck, FolderKanban, Activity, UserPlus } from 'lucide-react'

type DashboardSectionProps = {
  canViewUsers: boolean
  canViewProjects: boolean
  canViewActivity: boolean
}

export function DashboardSection({ canViewUsers, canViewProjects, canViewActivity }: DashboardSectionProps) {
  const { data: stats, loading, error, fetchStats } = useUserManagementStats()

  useEffect(() => {
    if (canViewUsers || canViewProjects || canViewActivity) {
      fetchStats()
    }
  }, [fetchStats, canViewUsers, canViewProjects, canViewActivity])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {typeof error.message === 'string' ? error.message : error.message.join(', ')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-8">No stats available.</p>
        </CardContent>
      </Card>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: 'All registered users',
      icon: Users,
      allowed: canViewUsers,
    },
    {
      title: 'User Management Access',
      value: stats.totalAdmins,
      description: 'Users with user management rights',
      icon: Shield,
      allowed: canViewUsers,
    },
    {
      title: 'Regular Users',
      value: stats.totalRegularUsers,
      description: 'Standard users',
      icon: UserCheck,
      allowed: canViewUsers,
    },
    {
      title: 'Projects',
      value: stats.totalProjects,
      description: 'Total projects',
      icon: FolderKanban,
      allowed: canViewProjects,
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivityCount,
      description: 'New users (last 7 days)',
      icon: Activity,
      allowed: canViewUsers,
    },
    {
      title: 'New This Month',
      value: stats.newUsersThisMonth,
      description: 'Users joined this month',
      icon: UserPlus,
      allowed: canViewUsers,
    },
  ]

  const visibleCards = statCards.filter((card) => card.allowed)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Key statistics at a glance</p>
      </div>

      {visibleCards.length === 0 ? (
        <Card className="border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              No dashboard metrics available for your permissions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="border hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium text-foreground mb-1">{stat.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">{stat.description}</CardDescription>
                    </div>
                    <div className="flex-shrink-0 p-2 rounded-lg border bg-muted/30">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}





