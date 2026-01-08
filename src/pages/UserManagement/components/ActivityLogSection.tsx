import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, X } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { GET_USER_MANAGEMENT_ACTIVITY } from '@/utils/api.routes'

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /ssh/i,
  /private/i,
  /credential/i,
  /api[-_]?key/i,
  /access[-_]?key/i,
  /command/i,
]

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create_user', label: 'Create User' },
  { value: 'update_user', label: 'Update User' },
  { value: 'delete_user', label: 'Delete User' },
  { value: 'create_client', label: 'Create Client' },
  { value: 'create_project', label: 'Create Project' },
  { value: 'update_project', label: 'Update Project' },
  { value: 'delete_project', label: 'Delete Project' },
  { value: 'create_server_project', label: 'Create Server Project' },
  { value: 'update_server_project', label: 'Update Server Project' },
  { value: 'delete_server_project', label: 'Delete Server Project' },
  { value: 'create_server', label: 'Create Server' },
  { value: 'update_server', label: 'Update Server' },
  { value: 'delete_server', label: 'Delete Server' },
  { value: 'create_server_action', label: 'Create Server Action' },
  { value: 'update_server_action', label: 'Update Server Action' },
  { value: 'delete_server_action', label: 'Delete Server Action' },
  { value: 'trigger_server_action', label: 'Trigger Server Action' },
  { value: 'update_system_settings', label: 'Update System Settings' },
]

const PAGE_SIZE = 20
const MAX_ARRAY_ITEM_LENGTH = 120

type AdminActivity = {
  id: string
  adminId: string
  action: string
  targetType: 'user' | 'project' | 'server_project' | 'server' | 'server_action' | 'system'
  targetId: string
  targetLabel?: string
  title?: string
  summary?: string
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

type ChangeEntry = {
  label: string
  value: unknown
}

export function ActivityLogSection({ canViewActivity }: ActivityLogSectionProps) {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<AdminActivity | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const fetchActivities = async (options?: { append?: boolean; reset?: boolean; nextLimit?: number }) => {
    if (!canViewActivity) return
    const isAppend = Boolean(options?.append)
    const requestedLimit = options?.nextLimit ?? (options?.reset ? PAGE_SIZE : limit)
    if (isAppend) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const params = new URLSearchParams()
      if (actionFilter) params.append('action', actionFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', String(requestedLimit))

      const response = await axiosInstance.get<{ status: string; data: AdminActivity[] }>(
        `${GET_USER_MANAGEMENT_ACTIVITY()}${params.toString() ? `?${params.toString()}` : ''}`
      )

      const incoming = response.data.data
      let nextActivities = incoming
      if (isAppend) {
        const existingIds = new Set(activities.map((activity) => activity.id))
        const lastTimestamp = activities.length
          ? new Date(activities[activities.length - 1].timestamp).getTime()
          : undefined
        const appended = incoming.filter((activity) => {
          if (existingIds.has(activity.id)) return false
          if (lastTimestamp === undefined) return true
          return new Date(activity.timestamp).getTime() <= lastTimestamp
        })
        nextActivities = [...activities, ...appended]
      }
      setActivities(nextActivities)

      const adminIds = [...new Set(nextActivities.map((activity) => activity.adminId))]
      const targetUserIds = [
        ...new Set(
          nextActivities
            .filter((activity) => activity.targetType === 'user')
            .map((activity) => activity.targetId)
        ),
      ]

      const allUserIds = [...new Set([...adminIds, ...targetUserIds])]
      const missingUserIds = allUserIds.filter((id) => !users[id])
      const userPromises = missingUserIds.map(async (id) => {
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
      if (userResults.length > 0) {
        const userMap: Record<string, User> = {}
        userResults.forEach((result) => {
          if (result) {
            userMap[result.id] = result.user
          }
        })
        setUsers((prev) => ({ ...prev, ...userMap }))
      }

      if (requestedLimit !== limit) {
        setLimit(requestedLimit)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity log')
    } finally {
      if (isAppend) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins <= 0) return 'Now'
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const dateLabel = date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${dateLabel} | ${formatRelativeTime(date)}`
  }

  const formatTimestampDetail = (timestamp: string) => {
    const date = new Date(timestamp)
    const dateLabel = date.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${dateLabel} | ${formatRelativeTime(date)}`
  }

  const formatTargetType = (targetType: AdminActivity['targetType']) =>
    targetType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const getActionTitle = (activity: AdminActivity) => activity.title || formatAction(activity.action)

  const getTargetLabel = (activity: AdminActivity) => {
    if (activity.targetType === 'user') {
      return users[activity.targetId]?.name || activity.targetLabel || 'Unknown User'
    }
    return activity.targetLabel || activity.targetId
  }

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === 'object' && !Array.isArray(value))

  const unwrapDocumentValue = (value: unknown): unknown => {
    if (isPlainObject(value)) {
      const docValue = (value as Record<string, unknown>)._doc
      if (isPlainObject(docValue)) {
        return docValue
      }
    }
    return value
  }

  const shouldIgnoreKey = (key: string) => key.startsWith('$') || key === '_doc' || key === '__v'

  const sanitizeLabel = (label: string) => {
    const parts = label.split('.').filter((part) => part && !shouldIgnoreKey(part))
    return parts.join('.')
  }

  const truncateDisplayValue = (value: string) =>
    value.length > MAX_ARRAY_ITEM_LENGTH ? `${value.slice(0, MAX_ARRAY_ITEM_LENGTH)}...` : value

  const stableStringify = (value: unknown): string => {
    const resolved = unwrapDocumentValue(value)
    if (resolved === null) return 'null'
    if (resolved === undefined) return 'undefined'
    if (typeof resolved === 'string') return resolved
    if (typeof resolved === 'number' || typeof resolved === 'boolean') return String(resolved)
    if (resolved instanceof Date) return resolved.toISOString()
    if (Array.isArray(resolved)) {
      return `[${resolved.map((item) => stableStringify(item)).join(', ')}]`
    }
    if (isPlainObject(resolved)) {
      const keys = Object.keys(resolved).filter((key) => !shouldIgnoreKey(key)).sort()
      return `{${keys
        .map((key) => `${key}:${stableStringify((resolved as Record<string, unknown>)[key])}`)
        .join(', ')}}`
    }
    try {
      return String(resolved)
    } catch {
      return '[unavailable]'
    }
  }

  const normalizeArrayDisplay = (values: unknown[]) =>
    values.map((value) => truncateDisplayValue(stableStringify(value)))

  const valuesEqual = (left: unknown, right: unknown): boolean => {
    if (left === right) return true
    if (left === null || left === undefined || right === null || right === undefined) return false
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) return false
      return left.every((item, index) => valuesEqual(item, right[index]))
    }
    if (isPlainObject(left) && isPlainObject(right)) {
      const leftKeys = Object.keys(left).filter((key) => !shouldIgnoreKey(key))
      const rightKeys = Object.keys(right).filter((key) => !shouldIgnoreKey(key))
      if (leftKeys.length !== rightKeys.length) return false
      return leftKeys.every((key) =>
        valuesEqual(unwrapDocumentValue(left[key]), unwrapDocumentValue(right[key]))
      )
    }
    return false
  }

  const collectArrayDiffs = (
    baseLabel: string,
    fromValue: unknown[],
    toValue: unknown[],
    entries: ChangeEntry[]
  ) => {
    const fromKeys = new Set<string>()
    const toKeys = new Set<string>()
    const fromOrder: string[] = []
    const toOrder: string[] = []
    const fromLabels: Record<string, string> = {}
    const toLabels: Record<string, string> = {}

    fromValue.forEach((item) => {
      const key = stableStringify(item)
      if (!fromKeys.has(key)) {
        fromKeys.add(key)
        fromOrder.push(key)
        fromLabels[key] = truncateDisplayValue(key)
      }
    })

    toValue.forEach((item) => {
      const key = stableStringify(item)
      if (!toKeys.has(key)) {
        toKeys.add(key)
        toOrder.push(key)
        toLabels[key] = truncateDisplayValue(key)
      }
    })

    const added = toOrder.filter((key) => !fromKeys.has(key))
    const removed = fromOrder.filter((key) => !toKeys.has(key))

    if (added.length) {
      entries.push({
        label: `${baseLabel}.added`,
        value: added.map((key) => toLabels[key]),
      })
    }

    if (removed.length) {
      entries.push({
        label: `${baseLabel}.removed`,
        value: removed.map((key) => fromLabels[key]),
      })
    }
  }

  const collectNestedDiffs = (
    baseLabel: string,
    fromValue: Record<string, unknown>,
    toValue: Record<string, unknown>,
    entries: ChangeEntry[]
  ) => {
    const keys = new Set([...Object.keys(fromValue), ...Object.keys(toValue)])
    keys.forEach((key) => {
      if (shouldIgnoreKey(key)) return
      const fromChild = unwrapDocumentValue(fromValue[key])
      const toChild = unwrapDocumentValue(toValue[key])
      if (isPlainObject(fromChild) && isPlainObject(toChild)) {
        const nestedLabel = baseLabel ? `${baseLabel}.${key}` : key
        collectNestedDiffs(nestedLabel, fromChild, toChild, entries)
        return
      }
      if (valuesEqual(fromChild, toChild)) return
      entries.push({
        label: baseLabel ? `${baseLabel}.${key}` : key,
        value: { from: fromChild ?? null, to: toChild ?? null },
      })
    })
  }

  const collectObjectEntries = (
    baseLabel: string,
    value: Record<string, unknown>,
    entries: ChangeEntry[]
  ) => {
    Object.entries(value).forEach(([key, child]) => {
      if (shouldIgnoreKey(key)) return
      const label = baseLabel ? `${baseLabel}.${key}` : key
      const resolvedChild = unwrapDocumentValue(child)
      if (isPlainObject(resolvedChild)) {
        collectObjectEntries(label, resolvedChild, entries)
        return
      }
      if (Array.isArray(resolvedChild)) {
        entries.push({ label, value: normalizeArrayDisplay(resolvedChild) })
        return
      }
      entries.push({ label, value: resolvedChild })
    })
  }

  const buildChangeEntries = (changes?: Record<string, unknown>): ChangeEntry[] => {
    if (!changes) return []

    if (Array.isArray(changes.fields)) {
      return (changes.fields as unknown[]).map((field) => ({
        label: String(field),
        value: 'Updated',
      }))
    }

    const entries: ChangeEntry[] = []

    Object.entries(changes).forEach(([label, rawValue]) => {
      const sanitizedLabel = sanitizeLabel(label)
      if (!sanitizedLabel) return
      const value = unwrapDocumentValue(rawValue)
      if (isFromToChange(value)) {
        const fromValue = unwrapDocumentValue((value as Record<string, unknown>).from)
        const toValue = unwrapDocumentValue((value as Record<string, unknown>).to)
        if (Array.isArray(fromValue) && Array.isArray(toValue)) {
          const startingLength = entries.length
          collectArrayDiffs(sanitizedLabel, fromValue, toValue, entries)
          if (entries.length !== startingLength) {
            return
          }
        }
        if (isPlainObject(fromValue) && isPlainObject(toValue)) {
          const startingLength = entries.length
          collectNestedDiffs(sanitizedLabel, fromValue, toValue, entries)
          if (entries.length !== startingLength) {
            return
          }
          return
        }
        if (valuesEqual(fromValue, toValue)) {
          return
        }
        entries.push({
          label: sanitizedLabel,
          value: { from: fromValue ?? null, to: toValue ?? null },
        })
        return
      }
      if (isPlainObject(value)) {
        const startingLength = entries.length
        collectObjectEntries(sanitizedLabel, value, entries)
        if (entries.length !== startingLength) {
          return
        }
      }
      if (Array.isArray(value)) {
        entries.push({ label: sanitizedLabel, value: normalizeArrayDisplay(value) })
        return
      }
      entries.push({ label: sanitizedLabel, value })
    })

    return entries
  }

  const isSensitiveField = (label: string) =>
    SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(label))

  const formatChangeValue = (label: string, value: unknown) => {
    const resolvedValue = unwrapDocumentValue(value)
    if (isSensitiveField(label)) return 'Redacted'
    if (resolvedValue === null) return 'Cleared'
    if (resolvedValue === undefined) return 'Updated'
    if (resolvedValue === '[redacted]') return 'Redacted'
    if (typeof resolvedValue === 'string') {
      const normalized = resolvedValue.trim().toLowerCase()
      if (normalized === '[redacted]') return 'Redacted'
      if (normalized === '[updated]') return 'Updated'
      if (normalized === '[unavailable]') return 'Updated'
      if (normalized === '[object]' || normalized === '[object object]') return 'Object'
      const itemsMatch = normalized.match(/^\[(\d+)\s+items\]$/)
      if (itemsMatch) return `${itemsMatch[1]} items`
      return resolvedValue
    }
    if (typeof resolvedValue === 'number' || typeof resolvedValue === 'boolean') return String(resolvedValue)
    if (Array.isArray(resolvedValue)) {
      return normalizeArrayDisplay(resolvedValue).join(', ')
    }
    if (typeof resolvedValue === 'object') {
      const keys = Object.keys(resolvedValue as Record<string, unknown>).filter(
        (key) => !shouldIgnoreKey(key)
      )
      return `${keys.length} fields`
    }
    return 'Updated'
  }

  const isFromToChange = (value: unknown): value is { from?: unknown; to?: unknown } => {
    return Boolean(
      value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        ('from' in (value as Record<string, unknown>) || 'to' in (value as Record<string, unknown>))
    )
  }

  const summaryFromChanges = (changes?: Record<string, unknown>) => {
    const fields = buildChangeEntries(changes).map((entry) => entry.label)
    if (!fields.length) return undefined
    const preview = fields.slice(0, 4).join(', ')
    const more = fields.length > 4 ? ` (+${fields.length - 4} more)` : ''
    return `Changed ${preview}${more}`
  }

  const clearFilters = () => {
    setActionFilter('')
    setStartDate('')
    setEndDate('')
    setSearch('')
    setLimit(PAGE_SIZE)
  }

  const handleActionFilter = (value: string) => {
    setLimit(PAGE_SIZE)
    setActionFilter(value)
  }

  const handleStartDate = (value: string) => {
    setLimit(PAGE_SIZE)
    setStartDate(value)
  }

  const handleEndDate = (value: string) => {
    setLimit(PAGE_SIZE)
    setEndDate(value)
  }

  useEffect(() => {
    if (canViewActivity) {
      fetchActivities({ reset: true })
    }
  }, [actionFilter, startDate, endDate, canViewActivity])

  const filteredActivities = useMemo(() => {
    if (!search.trim()) return activities
    const query = search.trim().toLowerCase()

    return activities.filter((activity) => {
      const actor = users[activity.adminId]
      const actorName = actor?.name?.toLowerCase() ?? ''
      const actorEmail = actor?.email?.toLowerCase() ?? ''
      const target = getTargetLabel(activity).toLowerCase()
      const actionTitle = getActionTitle(activity).toLowerCase()
      const summary = (activity.summary || summaryFromChanges(activity.changes) || '').toLowerCase()

      return (
        actorName.includes(query) ||
        actorEmail.includes(query) ||
        target.includes(query) ||
        actionTitle.includes(query) ||
        summary.includes(query)
      )
    })
  }, [activities, search, users])

  const canSeeMore = activities.length >= limit

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
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="search-logs">Search Logs</Label>
                <Input
                  id="search-logs"
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-filter">Action</Label>
                <select
                  id="action-filter"
                  value={actionFilter}
                  onChange={(e) => handleActionFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ACTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDate(e.target.value)}
                />
              </div>
              <Button onClick={clearFilters} variant="outline" size="sm" className="w-full lg:w-auto">
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
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">No activity found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="sm:hidden space-y-3">
            {filteredActivities.map((activity) => {
              const actor = users[activity.adminId]
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => setSelectedActivity(activity)}
                  className="w-full text-left rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/30"
                >
                  <div className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</div>
                  <div className="mt-1 text-sm font-semibold">{getActionTitle(activity)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Target: <span className="text-foreground">{getTargetLabel(activity)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Actor: <span className="text-foreground">{actor?.name || activity.adminId || 'Unknown'}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="hidden sm:block overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">Actor</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((activity) => {
                    const actor = users[activity.adminId]
                    return (
                      <tr
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity)}
                        className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/40"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            setSelectedActivity(activity)
                          }
                        }}
                      >
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(activity.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {actor?.name || activity.adminId || 'Unknown Admin'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{getActionTitle(activity)}</div>
                          <div className="text-xs text-muted-foreground">
                            {activity.summary || summaryFromChanges(activity.changes) || 'Details available'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{getTargetLabel(activity)}</div>
                          <div className="text-xs text-muted-foreground">{formatTargetType(activity.targetType)}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {canSeeMore && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchActivities({ append: true, nextLimit: limit + PAGE_SIZE })}
                disabled={loadingMore}
              >
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                See more
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(selectedActivity)} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        {selectedActivity && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{getActionTitle(selectedActivity)}</DialogTitle>
              <DialogDescription>
                {selectedActivity.summary || summaryFromChanges(selectedActivity.changes) || 'Activity details'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Actor</div>
                    <div className="font-medium">
                      {users[selectedActivity.adminId]?.name || 'Unknown Admin'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {users[selectedActivity.adminId]?.email || selectedActivity.adminId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Target</div>
                    <div className="font-medium">{getTargetLabel(selectedActivity)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTargetType(selectedActivity.targetType)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Date</div>
                    <div className="font-medium">{formatTimestampDetail(selectedActivity.timestamp)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase text-muted-foreground">Changes</div>
                {buildChangeEntries(selectedActivity.changes).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No additional change details recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {buildChangeEntries(selectedActivity.changes).map((entry) => {
                      const value = entry.value
                          const isTagList = Array.isArray(value) && value.every((item) => typeof item === 'string')
                          const shouldRedact = isSensitiveField(entry.label)
                          return (
                            <div key={entry.label} className="flex flex-col gap-1 rounded-md border border-border/60 bg-background px-3 py-2">
                              <div className="text-sm font-medium capitalize">{entry.label.replace(/_/g, ' ')}</div>
                              {shouldRedact ? (
                                <div className="text-xs text-muted-foreground">Redacted</div>
                              ) : isFromToChange(value) ? (
                                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                  <div>
                                    <div className="uppercase text-[10px] text-muted-foreground">From</div>
                                    <div className="font-medium text-foreground">
                                      {formatChangeValue(entry.label, value.from)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="uppercase text-[10px] text-muted-foreground">To</div>
                                    <div className="font-medium text-foreground">
                                      {formatChangeValue(entry.label, value.to)}
                                    </div>
                                  </div>
                                </div>
                              ) : isTagList ? (
                                <div className="flex flex-wrap gap-2">
                                  {(value as string[]).map((item) => (
                                    <span
                                      key={item}
                                      className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">{formatChangeValue(entry.label, value)}</div>
                              )}
                            </div>
                          )
                        })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
