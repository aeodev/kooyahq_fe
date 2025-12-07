import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAdminStats } from '@/hooks/admin.hooks'
import { Users, Shield, UserCheck, FolderKanban, Activity, UserPlus } from 'lucide-react'

export function DashboardSection() {
  const { data: stats, loading, error, fetchStats } = useAdminStats()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
      color: 'text-blue-600',
    },
    {
      title: 'Admins',
      value: stats.totalAdmins,
      description: 'Users with admin access',
      icon: Shield,
      color: 'text-purple-600',
    },
    {
      title: 'Regular Users',
      value: stats.totalRegularUsers,
      description: 'Standard users',
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      title: 'Projects',
      value: stats.totalProjects,
      description: 'Total projects',
      icon: FolderKanban,
      color: 'text-orange-600',
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivityCount,
      description: 'New users (last 7 days)',
      icon: Activity,
      color: 'text-red-600',
    },
    {
      title: 'New This Month',
      value: stats.newUsersThisMonth,
      description: 'Users joined this month',
      icon: UserPlus,
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Key statistics at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <CardDescription className="text-xs mt-1">{stat.description}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}






