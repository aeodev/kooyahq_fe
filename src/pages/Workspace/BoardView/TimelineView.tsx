import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatReadableDate } from '@/utils/date'
import type { Column, Priority, Task, TaskType } from './types'

export type TimelineZoom = 'week' | 'month' | 'quarter'

type DateUpdate = {
  startDate?: Date | null
  endDate?: Date | null
  dueDate?: Date | null
}

type TimelineViewProps = {
  tasks: Task[]
  allTasks: Task[]
  columns: Column[]
  searchQuery: string
  selectedFilters: {
    type: TaskType[]
    assignee: string[]
    labels: string[]
    status: string[]
    priority: Priority[]
  }
  onTaskClick: (task: Task) => void
  onUpdateTaskDates: (taskId: string, updates: DateUpdate) => Promise<void> | void
  canEdit: boolean
  zoom: TimelineZoom
  rangeStart: Date | null
  rangeEnd: Date | null
  rangeLocked: boolean
  onRangeStartChange: (value: Date | null) => void
  onRangeEndChange: (value: Date | null) => void
}

type TimelineRow =
  | { type: 'group'; id: string; label: string; count: number }
  | { type: 'task'; id: string; task: Task; unscheduled: boolean }

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'milestone'

type DragState = {
  taskId: string
  mode: DragMode
  originX: number
  startDate?: Date
  endDate?: Date
  dueDate?: Date
  lastDeltaDays: number
}

type DragPreview = {
  taskId: string
  startDate?: Date
  endDate?: Date
  dueDate?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_RANGE_PADDING_DAYS = 14
const RANGE_EXTENSION_DAYS = 30
const SCROLL_EDGE_THRESHOLD_PX = 220
const MIN_LEFT_PANE_WIDTH = 220
const MAX_LEFT_PANE_WIDTH = 600

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const diffInDays = (start: Date, end: Date): number =>
  Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS)

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const getHexColor = (colorClass: string): string | undefined => {
  if (!colorClass) return undefined
  if (colorClass.startsWith('#')) {
    return colorClass
  }
  if (colorClass.startsWith('bg-[')) {
    const match = colorClass.match(/bg-\[([^\]]+)\]/)
    return match?.[1] || undefined
  }
  const tailwindColorMap: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-purple-500': '#a855f7',
    'bg-pink-500': '#ec4899',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-teal-500': '#14b8a6',
    'bg-orange-500': '#f97316',
    'bg-amber-500': '#f59e0b',
    'bg-slate-400': '#94a3b8',
    'bg-slate-500': '#64748b',
  }
  return tailwindColorMap[colorClass] || undefined
}

const hasAnyDate = (task: Task): boolean =>
  Boolean(task.startDate || task.endDate || task.dueDate)

const getSortDate = (task: Task): number => {
  const date = task.startDate || task.endDate || task.dueDate
  return date ? startOfDay(date).getTime() : 0
}

const getPriorityIcon = (priority: Priority) => {
  const colors: Record<Priority, string> = {
    highest: 'text-red-600',
    high: 'text-red-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
    lowest: 'text-blue-400',
  }
  const baseClass = cn('h-3.5 w-3.5', colors[priority])

  switch (priority) {
    case 'highest':
      return <ChevronsUp className={baseClass} />
    case 'high':
      return <ChevronUp className={baseClass} />
    case 'medium':
      return <Minus className={baseClass} />
    case 'low':
      return <ChevronDown className={baseClass} />
    case 'lowest':
      return <ChevronsDown className={baseClass} />
    default:
      return <Minus className={baseClass} />
  }
}

export function TimelineView({
  tasks,
  allTasks,
  columns,
  searchQuery,
  selectedFilters,
  onTaskClick,
  onUpdateTaskDates,
  canEdit,
  zoom,
  rangeStart,
  rangeEnd,
  rangeLocked,
  onRangeStartChange,
  onRangeEndChange,
}: TimelineViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [leftPaneWidth, setLeftPaneWidth] = useState(256)
  const dragStateRef = useRef<DragState | null>(null)
  const dragMovedRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const rangeExtensionRef = useRef(false)
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const scheduledTasks = useMemo(() => tasks.filter(hasAnyDate), [tasks])
  const scheduledDateBounds = useMemo(() => {
    let minTime = Number.POSITIVE_INFINITY
    let maxTime = Number.NEGATIVE_INFINITY
    let minStartTime = Number.POSITIVE_INFINITY

    scheduledTasks.forEach((task) => {
      if (task.startDate) {
        const time = startOfDay(task.startDate).getTime()
        minStartTime = Math.min(minStartTime, time)
        minTime = Math.min(minTime, time)
        maxTime = Math.max(maxTime, time)
      }
      if (task.endDate) {
        const time = startOfDay(task.endDate).getTime()
        minTime = Math.min(minTime, time)
        maxTime = Math.max(maxTime, time)
      }
      if (task.dueDate) {
        const time = startOfDay(task.dueDate).getTime()
        minTime = Math.min(minTime, time)
        maxTime = Math.max(maxTime, time)
      }
    })

    if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return null

    return {
      min: new Date(minTime),
      max: new Date(maxTime),
      minStart: Number.isFinite(minStartTime) ? new Date(minStartTime) : null,
    }
  }, [scheduledTasks])
  const minPastDate = scheduledDateBounds?.minStart ?? scheduledDateBounds?.min ?? null

  const epicLookup = useMemo(() => {
    const map = new Map<string, Task>()
    allTasks.forEach((task) => {
      if (task.type === 'epic') {
        map.set(task.id, task)
      }
    })
    return map
  }, [allTasks])

  const resolveEpicLabel = useCallback(
    (epicId?: string): string => {
      if (!epicId) return 'Independent'
      const epic = epicLookup.get(epicId)
      if (!epic) return 'Epic'
      if (epic.key && epic.title) return `${epic.key} ${epic.title}`
      return epic.key || epic.title || 'Epic'
    },
    [epicLookup]
  )

  useEffect(() => {
    if (rangeLocked) return
    const today = startOfDay(new Date())
    let nextStart = addDays(today, -DEFAULT_RANGE_PADDING_DAYS)
    let nextEnd = addDays(today, DEFAULT_RANGE_PADDING_DAYS)

    if (scheduledDateBounds) {
      const anchorStart = scheduledDateBounds.min < today ? scheduledDateBounds.min : today
      const anchorEnd = scheduledDateBounds.max > today ? scheduledDateBounds.max : today
      nextStart = addDays(anchorStart, -DEFAULT_RANGE_PADDING_DAYS)
      nextEnd = addDays(anchorEnd, DEFAULT_RANGE_PADDING_DAYS)
      if (minPastDate && nextStart < minPastDate) {
        nextStart = minPastDate
      }
    }

    if (rangeStart && rangeEnd) {
      const currentStart = startOfDay(rangeStart)
      const currentEnd = startOfDay(rangeEnd)
      if (nextStart >= currentStart && nextEnd <= currentEnd) {
        return
      }
    }

    onRangeStartChange(nextStart)
    onRangeEndChange(nextEnd)
  }, [scheduledDateBounds, minPastDate, rangeLocked, rangeStart, rangeEnd, onRangeStartChange, onRangeEndChange])

  const normalizedRangeStart = rangeStart ? startOfDay(rangeStart) : null
  const normalizedRangeEnd = rangeEnd ? startOfDay(rangeEnd) : null

  const pixelsPerDay = zoom === 'week' ? 32 : zoom === 'month' ? 14 : 8
  const totalDays =
    normalizedRangeStart && normalizedRangeEnd
      ? Math.max(1, diffInDays(normalizedRangeStart, normalizedRangeEnd) + 1)
      : 1
  const timelineWidth = totalDays * pixelsPerDay

  const extendRange = useCallback(
    (direction: 'past' | 'future') => {
      const container = scrollContainerRef.current
      if (!container || rangeExtensionRef.current) return
      rangeExtensionRef.current = true

      if (direction === 'past') {
        if (rangeStart) {
          const currentStart = startOfDay(rangeStart)
          let nextStart = addDays(currentStart, -RANGE_EXTENSION_DAYS)
          if (minPastDate && nextStart < minPastDate) {
            nextStart = minPastDate
          }
          const shiftDays = diffInDays(currentStart, nextStart)
          if (shiftDays < 0) {
            container.scrollLeft += Math.abs(shiftDays) * pixelsPerDay
            onRangeStartChange(nextStart)
          }
        }
      } else if (rangeEnd) {
        onRangeEndChange(addDays(rangeEnd, RANGE_EXTENSION_DAYS))
      }

      window.requestAnimationFrame(() => {
        rangeExtensionRef.current = false
      })
    },
    [pixelsPerDay, rangeStart, rangeEnd, onRangeStartChange, onRangeEndChange, minPastDate]
  )

  const handleTimelineScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !normalizedRangeStart || !normalizedRangeEnd) return

    const { scrollLeft, clientWidth, scrollWidth } = container
    if (scrollWidth <= clientWidth) return

    const nearLeft = scrollLeft <= SCROLL_EDGE_THRESHOLD_PX
    const nearRight = scrollLeft + clientWidth >= scrollWidth - SCROLL_EDGE_THRESHOLD_PX

    if (nearLeft) extendRange('past')
    if (nearRight) extendRange('future')
  }, [extendRange, normalizedRangeStart, normalizedRangeEnd])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !normalizedRangeStart || !normalizedRangeEnd) return
    if (rangeLocked || container.clientWidth === 0) return

    const minDaysForScroll = Math.ceil(
      (container.clientWidth + SCROLL_EDGE_THRESHOLD_PX) / pixelsPerDay
    )
    if (totalDays >= minDaysForScroll) return

    const missingDays = minDaysForScroll - totalDays
    const addEachSide = Math.ceil(missingDays / 2)

    if (rangeStart && rangeEnd) {
      let nextStart = addDays(rangeStart, -addEachSide)
      const nextEnd = addDays(rangeEnd, addEachSide)
      if (minPastDate && nextStart < minPastDate) {
        nextStart = minPastDate
      }
      if (nextStart.getTime() !== rangeStart.getTime()) {
        onRangeStartChange(nextStart)
      }
      if (nextEnd.getTime() !== rangeEnd.getTime()) {
        onRangeEndChange(nextEnd)
      }
    }
  }, [normalizedRangeStart, normalizedRangeEnd, pixelsPerDay, rangeLocked, totalDays, rangeStart, rangeEnd, onRangeStartChange, onRangeEndChange, minPastDate])

  const statusColorMap = useMemo(() => {
    const map = new Map<string, { className: string; hexColor?: string }>()
    columns.forEach((column) => {
      map.set(column.name, {
        className: column.color,
        hexColor: getHexColor(column.color),
      })
    })
    return map
  }, [columns])

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const groupedRows = useMemo(() => {
    const groups = new Map<string, { label: string; tasks: Task[] }>()

    tasks.forEach((task) => {
      const resolvedEpicId = task.epic && epicLookup.has(task.epic) ? task.epic : undefined
      const groupKey = task.type === 'epic' ? task.id : resolvedEpicId ?? 'independent'
      const label = groupKey === 'independent' ? 'Independent' : resolveEpicLabel(groupKey)
      const entry = groups.get(groupKey) ?? { label, tasks: [] }
      entry.tasks.push(task)
      groups.set(groupKey, entry)
    })

    const orderedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'independent') return 1
      if (b === 'independent') return -1
      const labelA = groups.get(a)?.label || ''
      const labelB = groups.get(b)?.label || ''
      return labelA.localeCompare(labelB)
    })

    const rows: TimelineRow[] = []
    orderedGroupKeys.forEach((groupKey) => {
      const group = groups.get(groupKey)
      if (!group) return
      const rowId = `group-${groupKey}`
      rows.push({ type: 'group', id: rowId, label: group.label, count: group.tasks.length })
      if (collapsedGroups.has(rowId)) {
        return
      }

      const sortedTasks = [...group.tasks].sort((a, b) => {
        const aScheduled = hasAnyDate(a)
        const bScheduled = hasAnyDate(b)
        if (aScheduled !== bScheduled) {
          return aScheduled ? -1 : 1
        }
        if (aScheduled && bScheduled) {
          const dateDiff = getSortDate(a) - getSortDate(b)
          if (dateDiff !== 0) return dateDiff
        }
        return a.title.localeCompare(b.title)
      })

      sortedTasks.forEach((task) => {
        rows.push({ type: 'task', id: task.id, task, unscheduled: !hasAnyDate(task) })
      })
    })

    return rows
  }, [tasks, resolveEpicLabel, collapsedGroups])

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedFilters.type.length > 0 ||
    selectedFilters.assignee.length > 0 ||
    selectedFilters.labels.length > 0 ||
    selectedFilters.status.length > 0 ||
    selectedFilters.priority.length > 0

  const ticks = useMemo(() => {
    if (!normalizedRangeStart || !normalizedRangeEnd) return []
    const items: Array<{ label: string; dayIndex: number }> = []

    if (zoom === 'week') {
      for (
        let cursor = normalizedRangeStart;
        cursor <= normalizedRangeEnd;
        cursor = addDays(cursor, 1)
      ) {
        items.push({
          label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          dayIndex: diffInDays(normalizedRangeStart, cursor),
        })
      }
      return items
    }

    if (zoom === 'month') {
      for (
        let cursor = normalizedRangeStart;
        cursor <= normalizedRangeEnd;
        cursor = addDays(cursor, 7)
      ) {
        items.push({
          label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          dayIndex: diffInDays(normalizedRangeStart, cursor),
        })
      }
      return items
    }

    let cursor = new Date(normalizedRangeStart.getFullYear(), normalizedRangeStart.getMonth(), 1)
    if (cursor < normalizedRangeStart) {
      cursor = new Date(normalizedRangeStart.getFullYear(), normalizedRangeStart.getMonth() + 1, 1)
    }
    while (cursor <= normalizedRangeEnd) {
      items.push({
        label: cursor.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        dayIndex: diffInDays(normalizedRangeStart, cursor),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return items
  }, [normalizedRangeStart, normalizedRangeEnd, zoom])

  const todayIndex =
    normalizedRangeStart && normalizedRangeEnd
      ? diffInDays(normalizedRangeStart, startOfDay(new Date()))
      : null

  const getPreviewDates = useCallback((state: DragState, deltaDays: number): DragPreview => {
    if (state.mode === 'milestone' && state.dueDate) {
      return { taskId: state.taskId, dueDate: addDays(state.dueDate, deltaDays) }
    }

    const preview: DragPreview = { taskId: state.taskId }

    if (state.mode === 'move') {
      if (state.startDate) preview.startDate = addDays(state.startDate, deltaDays)
      if (state.endDate) preview.endDate = addDays(state.endDate, deltaDays)
      if (state.dueDate && !state.startDate && !state.endDate) {
        preview.dueDate = addDays(state.dueDate, deltaDays)
      }
      return preview
    }

    if (state.mode === 'resize-start' && state.startDate) {
      const candidate = addDays(state.startDate, deltaDays)
      preview.startDate = state.endDate && candidate > state.endDate ? state.endDate : candidate
      if (state.endDate) preview.endDate = state.endDate
      return preview
    }

    if (state.mode === 'resize-end' && state.endDate) {
      const candidate = addDays(state.endDate, deltaDays)
      preview.endDate = state.startDate && candidate < state.startDate ? state.startDate : candidate
      if (state.startDate) preview.startDate = state.startDate
      return preview
    }

    return preview
  }, [])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current
      if (!state || !normalizedRangeStart) return
      const deltaDays = Math.round((event.clientX - state.originX) / pixelsPerDay)
      if (deltaDays === state.lastDeltaDays) return
      state.lastDeltaDays = deltaDays
      if (deltaDays !== 0) {
        dragMovedRef.current = true
      }
      setDragPreview(getPreviewDates(state, deltaDays))
    },
    [getPreviewDates, normalizedRangeStart, pixelsPerDay]
  )

  const handlePointerUp = useCallback(async () => {
    const state = dragStateRef.current
    if (!state) return
    const deltaDays = state.lastDeltaDays
    const preview = getPreviewDates(state, deltaDays)
    dragStateRef.current = null
    setDragPreview(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)

    if (deltaDays === 0) {
      dragMovedRef.current = false
      return
    }

    const updates: DateUpdate = {}
    if (state.mode === 'milestone' && preview.dueDate) {
      updates.dueDate = preview.dueDate
    } else {
      if (state.startDate) {
        updates.startDate = preview.startDate ?? state.startDate
      }
      if (state.endDate) {
        updates.endDate = preview.endDate ?? state.endDate
      }
      if (!state.startDate && !state.endDate && state.dueDate) {
        updates.dueDate = preview.dueDate ?? state.dueDate
      }
    }

    dragMovedRef.current = true
    if (Object.keys(updates).length > 0) {
      await onUpdateTaskDates(state.taskId, updates)
    }
  }, [getPreviewDates, handlePointerMove, onUpdateTaskDates])

  const handleDividerPointerMove = useCallback((event: PointerEvent) => {
    const state = resizeStateRef.current
    if (!state) return
    const delta = event.clientX - state.startX
    const nextWidth = Math.max(
      MIN_LEFT_PANE_WIDTH,
      Math.min(MAX_LEFT_PANE_WIDTH, state.startWidth + delta)
    )
    setLeftPaneWidth(nextWidth)
  }, [])

  const handleDividerPointerUp = useCallback(() => {
    if (!resizeStateRef.current) return
    resizeStateRef.current = null
    window.removeEventListener('pointermove', handleDividerPointerMove)
    window.removeEventListener('pointerup', handleDividerPointerUp)
  }, [handleDividerPointerMove])

  const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeStateRef.current = { startX: event.clientX, startWidth: leftPaneWidth }
    window.addEventListener('pointermove', handleDividerPointerMove)
    window.addEventListener('pointerup', handleDividerPointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleDividerPointerMove)
      window.removeEventListener('pointerup', handleDividerPointerUp)
    }
  }, [handleDividerPointerMove, handleDividerPointerUp])

  const startDrag = (event: React.PointerEvent, task: Task, mode: DragMode) => {
    if (!canEdit || !normalizedRangeStart) return
    event.preventDefault()
    event.stopPropagation()
    dragMovedRef.current = false
    dragStateRef.current = {
      taskId: task.id,
      mode,
      originX: event.clientX,
      startDate: task.startDate ? startOfDay(task.startDate) : undefined,
      endDate: task.endDate ? startOfDay(task.endDate) : undefined,
      dueDate: task.dueDate ? startOfDay(task.dueDate) : undefined,
      lastDeltaDays: 0,
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleTaskBarClick = (event: React.MouseEvent, task: Task) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      event.preventDefault()
      return
    }
    onTaskClick(task)
  }

  const renderBar = (task: Task, isUnscheduled: boolean) => {
    if (isUnscheduled || !normalizedRangeStart || !normalizedRangeEnd) {
      return (
        <span className="text-xs text-muted-foreground px-2">No dates</span>
      )
    }

    const preview = dragPreview?.taskId === task.id ? dragPreview : null
    const isMilestone = !task.startDate && !task.endDate && (preview?.dueDate || task.dueDate)
    const statusColors = statusColorMap.get(task.status)
    const colorClass = statusColors?.className ?? 'bg-slate-400'
    const resolvedColor =
      statusColors?.hexColor ?? getHexColor(colorClass) ?? 'hsl(var(--primary))'
    const barStyle = { backgroundColor: resolvedColor }

    if (isMilestone) {
      const due = preview?.dueDate || task.dueDate
      if (!due) return null
      const offset = diffInDays(normalizedRangeStart, startOfDay(due))
      if (offset < 0 || offset > totalDays - 1) return null
      const left = offset * pixelsPerDay

      return (
        <div
          className={cn('absolute top-1/2 -translate-y-1/2', canEdit && 'touch-none')}
          style={{ left }}
          onPointerDown={(event) => startDrag(event, task, 'milestone')}
          onClick={(event) => handleTaskBarClick(event, task)}
        >
          <div
            className={cn(
              'h-3 w-3 rotate-45 border border-background',
              canEdit ? 'cursor-grab' : 'cursor-pointer'
            )}
            style={barStyle}
            title={`${task.key} ${task.title}\nDue ${formatReadableDate(due)}`}
          />
        </div>
      )
    }

    const previewStart = preview?.startDate
    const previewEnd = preview?.endDate
    const hasStart = Boolean(task.startDate)
    const hasEnd = Boolean(task.endDate)
    let start = previewStart || task.startDate || task.endDate || task.dueDate
    let end = previewEnd || task.endDate || task.startDate || task.dueDate
    if (previewStart && hasStart && !hasEnd) {
      end = previewStart
    }
    if (previewEnd && hasEnd && !hasStart) {
      start = previewEnd
    }
    if (!start || !end) return null

    let normalizedStart = startOfDay(start)
    let normalizedEnd = startOfDay(end)
    if (normalizedEnd < normalizedStart) {
      ;[normalizedStart, normalizedEnd] = [normalizedEnd, normalizedStart]
    }

    const offsetStart = diffInDays(normalizedRangeStart, normalizedStart)
    const offsetEnd = diffInDays(normalizedRangeStart, normalizedEnd)
    if (offsetEnd < 0 || offsetStart > totalDays - 1) return null

    const clampedStart = Math.max(0, offsetStart)
    const clampedEnd = Math.min(totalDays - 1, offsetEnd)
    const width = Math.max(6, (clampedEnd - clampedStart + 1) * pixelsPerDay)
    const left = clampedStart * pixelsPerDay
    const showLabel = width >= 90
    const showResizeHandles = canEdit && Boolean(task.startDate && task.endDate)

    return (
      <div
        className={cn('absolute top-1/2 -translate-y-1/2', canEdit && 'touch-none')}
        style={{ left, width }}
        onPointerDown={(event) => startDrag(event, task, 'move')}
        onClick={(event) => handleTaskBarClick(event, task)}
      >
        <div
          className={cn(
            'group relative flex h-6 items-center rounded-md px-2 text-[11px] font-medium text-white',
            canEdit ? 'cursor-grab' : 'cursor-pointer'
          )}
          style={barStyle}
          title={`${task.key} ${task.title}\n${formatReadableDate(normalizedStart)} -> ${formatReadableDate(normalizedEnd)}`}
        >
          {showResizeHandles && (
            <button
              type="button"
              className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 touch-none"
              onPointerDown={(event) => startDrag(event, task, 'resize-start')}
              aria-label="Resize start date"
            />
          )}
          {showLabel && (
            <span className="truncate">
              {task.key} {task.title}
            </span>
          )}
          {showResizeHandles && (
            <button
              type="button"
              className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 touch-none"
              onPointerDown={(event) => startDrag(event, task, 'resize-end')}
              aria-label="Resize end date"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/30 py-16">
          <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? 'No matching items.' : 'No scheduled items yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div className="flex">
            <div className="shrink-0" style={{ width: leftPaneWidth }}>
              <div className="h-8 border-b border-border/50 px-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center">
                Epic
              </div>
              {groupedRows.map((row) => {
                if (row.type === 'group') {
                  return (
                    <button
                      type="button"
                      key={row.id}
                      onClick={() => toggleGroup(row.id)}
                      className="h-8 w-full border-b border-border/50 bg-muted/30 px-3 text-xs font-semibold text-muted-foreground flex items-center justify-between text-left"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown
                          className={cn(
                            'h-3 w-3 transition-transform',
                            collapsedGroups.has(row.id) && '-rotate-90'
                          )}
                        />
                        {row.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{row.count}</span>
                    </button>
                  )
                }

                return (
                  <div
                    key={row.id}
                    className="h-10 border-b border-border/50 px-3 flex items-center gap-2 cursor-pointer hover:bg-accent/30"
                    onClick={() => onTaskClick(row.task)}
                  >
                    <span className="text-xs font-medium text-foreground whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                      {row.task.key}
                      <span
                        className="shrink-0"
                        title={row.task.priority.charAt(0).toUpperCase() + row.task.priority.slice(1)}
                      >
                        {getPriorityIcon(row.task.priority)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                      {row.task.title}
                    </span>
                  </div>
                )
              })}
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              className="relative w-2 cursor-col-resize"
              onPointerDown={handleDividerPointerDown}
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/60" />
            </div>
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto"
              onScroll={handleTimelineScroll}
            >
              <div className="relative" style={{ minWidth: timelineWidth }}>
                <div className="h-8 border-b border-border/50 text-[11px] text-muted-foreground">
                  {ticks.map((tick) => (
                    <div
                      key={`${tick.label}-${tick.dayIndex}`}
                      className="absolute top-0 h-8 flex items-center"
                      style={{ left: tick.dayIndex * pixelsPerDay }}
                    >
                      <span className="translate-x-1">{tick.label}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute top-8 bottom-0 left-0 right-0 pointer-events-none">
                  {ticks.map((tick) => (
                    <div
                      key={`line-${tick.dayIndex}`}
                      className="absolute top-0 bottom-0 border-l border-border/40"
                      style={{ left: tick.dayIndex * pixelsPerDay }}
                    />
                  ))}
                  {todayIndex !== null && todayIndex >= 0 && todayIndex <= totalDays - 1 && (
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-primary/60"
                      style={{ left: todayIndex * pixelsPerDay }}
                    />
                  )}
                </div>
                {groupedRows.map((row) =>
                  row.type === 'group' ? (
                    <div key={row.id} className="h-8 border-b border-border/50 bg-muted/20" />
                  ) : (
                    <div
                      key={row.id}
                      className={cn(
                        'relative h-10 border-b border-border/50',
                        row.unscheduled ? 'cursor-pointer hover:bg-accent/30' : ''
                      )}
                      onClick={row.unscheduled ? () => onTaskClick(row.task) : undefined}
                    >
                      {renderBar(row.task, row.unscheduled)}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
