import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { GET_USER_MANAGEMENT_ACTIVITY } from '@/utils/api.routes'

type AdminActivity = {
  id: string
  adminId: string
  action: 'update_user' | 'delete_user' | 'create_project' | 'update_project' | 'delete_project'
  targetType: 'user' | 'project'
  targetId: string
  changes?: Record<string, unknown>
  timestamp: string
}

type User = {
  id: string
  name: string
  email: string
}

type ActivityLogSectionProps = {
  canViewActivity: boolean
}

export function ActivityLogSection({ canViewActivity }: ActivityLogSectionProps) {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (canViewActivity) {
      fetchActivities()
    }
  }, [canViewActivity])

  const fetchActivities = async () => {
    if (!canViewActivity) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (actionFilter) params.append('action', actionFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await axiosInstance.get<{ status: string; data: AdminActivity[] }>(
        `${GET_USER_MANAGEMENT_ACTIVITY()}${params.toString() ? `?${params.toString()}` : ''}`
      )

      setActivities(response.data.data)

      // Fetch user names for admin IDs and target user IDs
      const adminIds = [...new Set(response.data.data.map((a) => a.adminId))]
      const targetUserIds = [
        ...new Set(
          response.data.data
            .filter((a) => a.targetType === 'user')
            .map((a) => a.targetId)
        ),
      ]

      const allUserIds = [...new Set([...adminIds, ...targetUserIds])]
      const userPromises = allUserIds.map(async (id) => {
        try {
          const userResponse = await axiosInstance.get<{ status: string; data: User }>(
            `/users/${id}`
          )
          return { id, user: userResponse.data.data }
        } catch {
          return null
        }
      })

      const userResults = await Promise.all(userPromises)
      const userMap: Record<string, User> = {}
      userResults.forEach((result) => {
        if (result) {
          userMap[result.id] = result.user
        }
      })
      setUsers(userMap)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const clearFilters = () => {
    setActionFilter('')
    setStartDate('')
    setEndDate('')
  }

  useEffect(() => {
    if (canViewActivity) {
      fetchActivities()
    }
  }, [actionFilter, startDate, endDate, canViewActivity])

  if (!canViewActivity) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">You do not have permission to view activity logs.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Activity Log</h2>
        <p className="text-sm text-muted-foreground mt-1">Track sensitive user management actions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <select
                id="action-filter"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Actions</option>
                <option value="update_user">Update User</option>
                <option value="delete_user">Delete User</option>
                <option value="create_project">Create Project</option>
                <option value="update_project">Update Project</option>
                <option value="delete_project">Delete Project</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">No activity found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {users[activity.adminId]?.name || 'Unknown Admin'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({users[activity.adminId]?.email || activity.adminId})
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{formatAction(activity.action)}</span> on{' '}
                      {activity.targetType === 'user' ? (
                        <>
                          <span className="font-medium">user</span>{' '}
                          <span className="font-semibold">
                            {users[activity.targetId]?.name || 'Unknown User'}
                          </span>
                          {users[activity.targetId]?.email && (
                            <span className="text-muted-foreground">
                              {' '}
                              ({users[activity.targetId]?.email})
                            </span>
                          )}
                          {!users[activity.targetId] && (
                            <span className="text-muted-foreground"> ({activity.targetId})</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-medium">{activity.targetType}</span> ({activity.targetId})
                        </>
                      )}
                    </p>
                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Changes: {JSON.stringify(activity.changes)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
