import { useState, useMemo } from 'react'
import { Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/utils/cn'
import type { Task, TaskType, Priority, Assignee } from './types'
import { getTaskTypeIcon, getPriorityIcon } from './index'
import { AssigneeAvatar } from './AssigneeAvatar'

type FilterCategory = 'type' | 'labels' | 'status' | 'priority' | 'assignee'

type FilterModalProps = {
  open: boolean
  onClose: () => void
  tasks: Task[]
  assignees: Assignee[]
  selectedFilters: {
    type: TaskType[]
    labels: string[]
    status: string[]
    priority: Priority[]
    assignee: string[]
  }
  onFiltersChange: (filters: {
    type: TaskType[]
    labels: string[]
    status: string[]
    priority: Priority[]
    assignee: string[]
  }) => void
}

const FILTER_CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'labels', label: 'Tags' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
]

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  task: 'Task',
  subtask: 'Subtask',
  epic: 'Epic',
  story: 'Story',
  bug: 'Bug',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
}

export function FilterModal({
  open,
  onClose,
  tasks,
  assignees,
  selectedFilters,
  onFiltersChange,
}: FilterModalProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('type')
  const [searchQuery, setSearchQuery] = useState('')

  // Extract unique values from tasks for each filter category
  const filterOptions = useMemo(() => {
    const types = new Set<TaskType>()
    const labels = new Set<string>()
    const statuses = new Set<string>()
    const priorities = new Set<Priority>()
    const assigneeIds = new Set<string>()

    tasks.forEach((task) => {
      types.add(task.type)
      task.labels.forEach((label) => labels.add(label))
      statuses.add(task.status)
      priorities.add(task.priority)
      if (task.assignee) {
        assigneeIds.add(task.assignee.id)
      }
    })

    // Get assignees that are actually used in tasks, sorted by name
    const usedAssignees = assignees
      .filter((assignee) => assigneeIds.has(assignee.id))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      type: Array.from(types).sort(),
      assignee: usedAssignees.map((a) => a.id),
      labels: Array.from(labels).sort(),
      status: Array.from(statuses).sort(),
      priority: Array.from(priorities).sort((a, b) => {
        const order: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']
        return order.indexOf(a) - order.indexOf(b)
      }),
    }
  }, [tasks, assignees])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const options = filterOptions[activeCategory]
    if (!searchQuery.trim()) return options

    const query = searchQuery.toLowerCase()
    return options.filter((option) => {
      if (activeCategory === 'type') {
        return TASK_TYPE_LABELS[option as TaskType].toLowerCase().includes(query)
      }
      if (activeCategory === 'assignee') {
        const assignee = assignees.find((a) => a.id === option)
        return assignee?.name.toLowerCase().includes(query) || false
      }
      if (activeCategory === 'priority') {
        return PRIORITY_LABELS[option as Priority].toLowerCase().includes(query)
      }
      return String(option).toLowerCase().includes(query)
    })
  }, [filterOptions, activeCategory, searchQuery, assignees])

  const handleToggleFilter = (value: string | TaskType | Priority) => {
    const currentFilters = { ...selectedFilters }
    
    if (activeCategory === 'type') {
      const typeValue = value as TaskType
      const index = currentFilters.type.indexOf(typeValue)
      if (index > -1) {
        currentFilters.type = currentFilters.type.filter((t) => t !== typeValue)
      } else {
        currentFilters.type = [...currentFilters.type, typeValue]
      }
    } else if (activeCategory === 'assignee') {
      const assigneeValue = value as string
      const index = currentFilters.assignee.indexOf(assigneeValue)
      if (index > -1) {
        currentFilters.assignee = currentFilters.assignee.filter((a) => a !== assigneeValue)
      } else {
        currentFilters.assignee = [...currentFilters.assignee, assigneeValue]
      }
    } else if (activeCategory === 'labels') {
      const labelValue = value as string
      const index = currentFilters.labels.indexOf(labelValue)
      if (index > -1) {
        currentFilters.labels = currentFilters.labels.filter((l) => l !== labelValue)
      } else {
        currentFilters.labels = [...currentFilters.labels, labelValue]
      }
    } else if (activeCategory === 'status') {
      const statusValue = value as string
      const index = currentFilters.status.indexOf(statusValue)
      if (index > -1) {
        currentFilters.status = currentFilters.status.filter((s) => s !== statusValue)
      } else {
        currentFilters.status = [...currentFilters.status, statusValue]
      }
    } else if (activeCategory === 'priority') {
      const priorityValue = value as Priority
      const index = currentFilters.priority.indexOf(priorityValue)
      if (index > -1) {
        currentFilters.priority = currentFilters.priority.filter((p) => p !== priorityValue)
      } else {
        currentFilters.priority = [...currentFilters.priority, priorityValue]
      }
    }

    onFiltersChange(currentFilters)
  }

  const isSelected = (value: string | TaskType | Priority): boolean => {
    if (activeCategory === 'type') {
      return selectedFilters.type.includes(value as TaskType)
    }
    if (activeCategory === 'assignee') {
      return selectedFilters.assignee.includes(value as string)
    }
    if (activeCategory === 'labels') {
      return selectedFilters.labels.includes(value as string)
    }
    if (activeCategory === 'status') {
      return selectedFilters.status.includes(value as string)
    }
    if (activeCategory === 'priority') {
      return selectedFilters.priority.includes(value as Priority)
    }
    return false
  }

  const getActiveCount = (category: FilterCategory): number => {
    return selectedFilters[category].length
  }

  const totalActiveFilters = useMemo(() => {
    return (
      selectedFilters.type.length +
      selectedFilters.assignee.length +
      selectedFilters.labels.length +
      selectedFilters.status.length +
      selectedFilters.priority.length
    )
  }, [selectedFilters])

  const handleClearAll = () => {
    onFiltersChange({
      type: [],
      assignee: [],
      labels: [],
      status: [],
      priority: [],
    })
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl">
      <div className="flex h-[500px]">
        {/* Left Sidebar - Filter Categories */}
        <div className="w-48 border-r border-border bg-muted/30 flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Filter</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {FILTER_CATEGORIES.map((category) => {
              const count = getActiveCount(category.value)
              const isActive = activeCategory === category.value
              
              return (
                <button
                  key={category.value}
                  onClick={() => {
                    setActiveCategory(category.value)
                    setSearchQuery('')
                  }}
                  className={cn(
                    'w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between',
                    isActive
                      ? 'bg-primary/10 text-foreground border-l-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{category.label}</span>
                  {count > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {totalActiveFilters > 0 && (
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>

        {/* Right Content Area - Filter Options */}
        <div className="flex-1 flex flex-col bg-background">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${FILTER_CATEGORIES.find((c) => c.value === activeCategory)?.label.toLowerCase() || ''}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredOptions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => {
                  const selected = isSelected(option)
                  
                  return (
                    <button
                      key={String(option)}
                      onClick={() => handleToggleFilter(option)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center gap-2 hover:bg-muted/50',
                        selected && 'bg-primary/10 border-l-2 border-primary'
                      )}
                    >
                      <div className={cn(
                        'h-4 w-4 border border-border rounded flex items-center justify-center flex-shrink-0',
                        selected && 'bg-primary border-primary'
                      )}>
                        {selected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {activeCategory === 'type' && (
                          <span className="flex-shrink-0">
                            {getTaskTypeIcon(option as TaskType, 'h-4 w-4')}
                          </span>
                        )}
                        {activeCategory === 'assignee' && (() => {
                          const assignee = assignees.find((a) => a.id === option)
                          return assignee ? <AssigneeAvatar assignee={assignee} size="xs" /> : null
                        })()}
                        {activeCategory === 'priority' && (
                          <span className="flex-shrink-0">
                            {getPriorityIcon(option as Priority)}
                          </span>
                        )}
                        <span className="truncate">
                          {activeCategory === 'type'
                            ? TASK_TYPE_LABELS[option as TaskType]
                            : activeCategory === 'assignee'
                            ? (() => {
                                const assignee = assignees.find((a) => a.id === option)
                                return assignee?.name || 'Unknown'
                              })()
                            : activeCategory === 'priority'
                            ? PRIORITY_LABELS[option as Priority]
                            : String(option)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="p-4 border-t border-border flex items-center justify-end">
            <span className="text-xs text-muted-foreground">
              {filteredOptions.length} of {filterOptions[activeCategory].length}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

