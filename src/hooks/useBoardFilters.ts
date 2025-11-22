import { useMemo } from 'react'
import type { Card } from '@/types/board'

export type FilterState = {
  assigneeId?: string
  priorities: string[]
  labels: string[]
  issueTypes: string[]
  flagged?: boolean
  epicId?: string
}

export function useBoardFilters(cards: Card[], filters: FilterState) {
  const filteredCards = useMemo(() => {
    let filtered = cards

    // Assignee filter
    if (filters.assigneeId) {
      filtered = filtered.filter((c) => c.assigneeId === filters.assigneeId)
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter((c) => filters.priorities.includes(c.priority))
    }

    // Labels filter
    if (filters.labels.length > 0) {
      filtered = filtered.filter((c) =>
        filters.labels.some((label) => c.labels.includes(label))
      )
    }

    // Issue type filter
    if (filters.issueTypes.length > 0) {
      filtered = filtered.filter((c) => filters.issueTypes.includes(c.issueType))
    }

    // Flagged filter
    if (filters.flagged !== undefined) {
      filtered = filtered.filter((c) => c.flagged === filters.flagged)
    }

    // Epic filter
    if (filters.epicId) {
      filtered = filtered.filter((c) => c.epicId === filters.epicId)
    }

    return filtered
  }, [cards, filters])

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.assigneeId ||
      filters.priorities.length > 0 ||
      filters.labels.length > 0 ||
      filters.issueTypes.length > 0 ||
      filters.flagged !== undefined ||
      !!filters.epicId
    )
  }, [filters])

  return {
    filteredCards,
    hasActiveFilters,
  }
}


