import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserSelector } from '@/components/ui/user-selector'
import { X, Filter } from 'lucide-react'
import type { Card as CardType } from '@/types/board'

type FilterState = {
  assigneeId?: string
  priorities: string[]
  labels: string[]
  issueTypes: string[]
  flagged?: boolean
  epicId?: string
}

type BacklogFiltersProps = {
  cards: CardType[]
  epics: CardType[]
  users: Array<{ id: string; name?: string; email?: string; profilePic?: string }>
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

const PRIORITIES = ['lowest', 'low', 'medium', 'high', 'highest'] as const
const ISSUE_TYPES = ['task', 'bug', 'story', 'epic'] as const

export function BacklogFilters({
  cards,
  epics,
  users,
  filters,
  onFiltersChange,
}: BacklogFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const allLabels = Array.from(new Set(cards.flatMap((c) => c.labels || [])))

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <K extends 'priorities' | 'labels' | 'issueTypes'>(
    key: K,
    value: string
  ) => {
    const current = filters[key] || []
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilter(key, updated as FilterState[K])
  }

  const clearFilter = (key: keyof FilterState) => {
    if (key === 'priorities' || key === 'labels' || key === 'issueTypes') {
      updateFilter(key, [])
    } else {
      updateFilter(key, undefined)
    }
  }

  const hasActiveFilters = 
    filters.assigneeId ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.issueTypes.length > 0 ||
    filters.flagged !== undefined ||
    filters.epicId

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-8"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {[
                filters.assigneeId && 1,
                filters.priorities.length,
                filters.labels.length,
                filters.issueTypes.length,
                filters.flagged !== undefined && 1,
                filters.epicId && 1,
              ].reduce((a, b) => (a || 0) + (b || 0), 0)}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({
              priorities: [],
              labels: [],
              issueTypes: [],
            })}
            className="h-8 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Assignee
            </label>
            <UserSelector
              value={filters.assigneeId}
              onChange={(userId) => updateFilter('assigneeId', userId || undefined)}
              placeholder="All assignees"
              className="h-8"
              showClear={true}
              allowedUserIds={users.map((u) => u.id)}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Priority
            </label>
            <div className="flex flex-wrap gap-1">
              {PRIORITIES.map((priority) => (
                <Button
                  key={priority}
                  variant={filters.priorities.includes(priority) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('priorities', priority)}
                  className="h-7 text-xs"
                >
                  {priority}
                </Button>
              ))}
            </div>
          </div>

          {/* Issue Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Issue Type
            </label>
            <div className="flex flex-wrap gap-1">
              {ISSUE_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={filters.issueTypes.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('issueTypes', type)}
                  className="h-7 text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Labels */}
          {allLabels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Labels
              </label>
              <div className="flex flex-wrap gap-1">
                {allLabels.slice(0, 10).map((label) => (
                  <Button
                    key={label}
                    variant={filters.labels.includes(label) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('labels', label)}
                    className="h-7 text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Epic */}
          {epics.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Epic
              </label>
              <select
                value={filters.epicId || ''}
                onChange={(e) => updateFilter('epicId', e.target.value || undefined)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
              >
                <option value="">All epics</option>
                {epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Flagged */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Flagged
            </label>
            <Button
              variant={filters.flagged === true ? 'default' : filters.flagged === false ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => {
                if (filters.flagged === undefined) {
                  updateFilter('flagged', true)
                } else if (filters.flagged === true) {
                  updateFilter('flagged', false)
                } else {
                  updateFilter('flagged', undefined)
                }
              }}
              className="h-7 text-xs"
            >
              {filters.flagged === true ? 'Flagged only' : filters.flagged === false ? 'Not flagged' : 'All'}
            </Button>
          </div>
        </div>
      )}

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.assigneeId && (
            <Badge variant="secondary" className="text-xs">
              Assignee: {users.find((u) => u.id === filters.assigneeId)?.name || 'Unknown'}
              <button
                onClick={() => clearFilter('assigneeId')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priorities.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs">
              {p}
              <button
                onClick={() => toggleArrayFilter('priorities', p)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.labels.map((l) => (
            <Badge key={l} variant="secondary" className="text-xs">
              {l}
              <button
                onClick={() => toggleArrayFilter('labels', l)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.issueTypes.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
              <button
                onClick={() => toggleArrayFilter('issueTypes', t)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.flagged !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {filters.flagged ? 'Flagged' : 'Not flagged'}
              <button
                onClick={() => clearFilter('flagged')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.epicId && (
            <Badge variant="secondary" className="text-xs">
              Epic: {epics.find((e) => e.id === filters.epicId)?.title || 'Unknown'}
              <button
                onClick={() => clearFilter('epicId')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

