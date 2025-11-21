import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { DraggableCard, DraggableColumn, DroppableColumn, DroppableList, DroppableColumnContainer } from '@/components/dnd'
import { UserAvatar } from '@/components/ui/user-selector'
import { useBoardStore } from '@/stores/board.store'
import { useUsers } from '@/hooks/user.hooks'
import { cn } from '@/utils/cn'
import axiosInstance from '@/utils/axios.instance'
import { GET_CARD_FILE } from '@/utils/api.routes'
import { SprintList } from './components/backlog/SprintList'
import type { Card as CardType, Sprint } from '@/types/board'
import { CreateIssueModal } from './components/CreateIssueModal'
import { CardDetailDrawer } from './components/CardDetailDrawer'
import { BoardMembersModal } from './components/BoardMembersModal'
import { StartSprintModal } from './components/StartSprintModal'
import { CompleteSprintModal } from './components/CompleteSprintModal'
import { BacklogItem } from './components/backlog/BacklogItem'
import { BacklogFilters } from './components/backlog/BacklogFilters'
import { EpicPanel } from './components/backlog/EpicPanel'
import { StoryPointsSummary } from './components/backlog/StoryPointsSummary'
import { KanbanMetricsPanel } from './components/KanbanMetricsPanel'
import { ArrowLeft, GripVertical } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  highest: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  lowest: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  story: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  task: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  bug: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
}

const ISSUE_TYPE_DOT_COLORS: Record<string, string> = {
  epic: 'bg-purple-500',
  story: 'bg-blue-500',
  task: 'bg-green-500',
  bug: 'bg-red-500',
}

function stripHtml(html: string): string {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const getWipStatus = (currentCount: number, limit?: number): 'ok' | 'warning' | 'exceeded' => {
  if (!limit) return 'ok'
  if (currentCount >= limit) return 'exceeded'
  if (currentCount >= limit * 0.8) return 'warning'
  return 'ok'
}

export function BoardDetail() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()

  const board = useBoardStore((state) => state.currentBoard)
  const cardsByBoardId = useBoardStore((state) => state.cardsByBoardId)
  const cards = useMemo(() => (boardId ? cardsByBoardId[boardId] || [] : []), [boardId, cardsByBoardId])
  const fetchBoard = useBoardStore((state) => state.fetchBoard)
  const fetchCards = useBoardStore((state) => state.fetchCards)
  const createCard = useBoardStore((state) => state.createCard)
  const moveCard = useBoardStore((state) => state.moveCard)
  const updateBoard = useBoardStore((state) => state.updateBoard)
  const deleteBoard = useBoardStore((state) => state.deleteBoard)
  const updateCard = useBoardStore((state) => state.updateCard)
  const deleteCard = useBoardStore((state) => state.deleteCard)
  const setCurrentBoard = useBoardStore((state) => state.setCurrentBoard)
  const bulkUpdateRanks = useBoardStore((state) => state.bulkUpdateRanks)
  const createSprint = useBoardStore((state) => state.createSprint)
  const updateSprint = useBoardStore((state) => state.updateSprint)
  const deleteSprint = useBoardStore((state) => state.deleteSprint)

  const { users } = useUsers()
  const [creatingCardLoading, setCreatingCardLoading] = useState(false)

  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const [editingBoardName, setEditingBoardName] = useState(false)
  const [boardNameValue, setBoardNameValue] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'board' | 'backlog'>('board')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [newColumnName, setNewColumnName] = useState('')

  // Backlog state
  const [backlogFilters, setBacklogFilters] = useState<{
    assigneeId?: string
    priorities: string[]
    labels: string[]
    issueTypes: string[]
    flagged?: boolean
    epicId?: string
  }>({
    priorities: [],
    labels: [],
    issueTypes: [],
  })
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())

  // Backlog-related computations (must be at top level for hooks)
  const backlogCards = useMemo(() => {
    if (!board) return []
    return cards.filter((c) => c.columnId === 'Backlog' || (board.columns[0] === c.columnId && board.type === 'sprint'))
  }, [cards, board])

  const epics = useMemo(() => {
    return cards.filter((c) => c.issueType === 'epic')
  }, [cards])

  const cardsByEpic = useMemo(() => {
    const map: Record<string, CardType[]> = {}
    backlogCards.forEach((card) => {
      if (card.epicId) {
        if (!map[card.epicId]) map[card.epicId] = []
        map[card.epicId].push(card)
      }
    })
    return map
  }, [backlogCards])

  const filteredBacklogCards = useMemo(() => {
    let filtered = backlogCards

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Assignee filter
    if (backlogFilters.assigneeId) {
      filtered = filtered.filter((c) => c.assigneeId === backlogFilters.assigneeId)
    }

    // Priority filter
    if (backlogFilters.priorities.length > 0) {
      filtered = filtered.filter((c) => backlogFilters.priorities.includes(c.priority))
    }

    // Labels filter
    if (backlogFilters.labels.length > 0) {
      filtered = filtered.filter((c) =>
        backlogFilters.labels.some((label) => c.labels.includes(label))
      )
    }

    // Issue type filter
    if (backlogFilters.issueTypes.length > 0) {
      filtered = filtered.filter((c) => backlogFilters.issueTypes.includes(c.issueType))
    }

    // Flagged filter
    if (backlogFilters.flagged !== undefined) {
      filtered = filtered.filter((c) => c.flagged === backlogFilters.flagged)
    }

    // Epic filter
    if (backlogFilters.epicId) {
      filtered = filtered.filter((c) => c.epicId === backlogFilters.epicId)
    }

    // Sort by rank (if available), then by creation date
    return filtered.sort((a, b) => {
      if (a.rank !== undefined && b.rank !== undefined) {
        return a.rank - b.rank
      }
      if (a.rank !== undefined) return -1
      if (b.rank !== undefined) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [backlogCards, searchQuery, backlogFilters])

  // Backlog handler functions
  const handleRankUpdate = async (cardId: string, newIndex: number) => {
    if (!boardId) return

    const currentIndex = filteredBacklogCards.findIndex((c) => c.id === cardId)
    if (currentIndex === -1 || currentIndex === newIndex) return

    // Calculate new ranks
    const rankUpdates = filteredBacklogCards.map((card, index) => {
      if (index === currentIndex) {
        // Moving card - assign rank based on new position
        const targetCard = filteredBacklogCards[newIndex]
        if (newIndex < currentIndex) {
          // Moving up - rank should be between previous card and target
          const prevCard = filteredBacklogCards[newIndex - 1]
          const rank = prevCard?.rank !== undefined
            ? (prevCard.rank + (targetCard?.rank || prevCard.rank + 1000)) / 2
            : (targetCard?.rank || 1000) - 1000
          return { id: card.id, rank: Math.floor(rank) }
        } else {
          // Moving down - rank should be between target and next card
          const nextCard = filteredBacklogCards[newIndex + 1]
          const rank = nextCard?.rank !== undefined
            ? ((targetCard?.rank || 0) + nextCard.rank) / 2
            : (targetCard?.rank || 0) + 1000
          return { id: card.id, rank: Math.floor(rank) }
        }
      } else if (
        (currentIndex < newIndex && index > currentIndex && index <= newIndex) ||
        (currentIndex > newIndex && index >= newIndex && index < currentIndex)
      ) {
        // Cards that need rank adjustment
        const baseRank = card.rank || index * 1000
        return { id: card.id, rank: baseRank }
      }
      return { id: card.id, rank: card.rank || index * 1000 }
    })

    await bulkUpdateRanks(boardId, rankUpdates)
    if (boardId) fetchCards(boardId)
  }

  const handleFlagToggle = async (cardId: string, flagged: boolean) => {
    await updateCard(cardId, { flagged })
    if (boardId) fetchCards(boardId)
  }

  const handleCardSelect = (cardId: string, selected: boolean) => {
    const newSelected = new Set(selectedCardIds)
    if (selected) {
      newSelected.add(cardId)
    } else {
      newSelected.delete(cardId)
    }
    setSelectedCardIds(newSelected)
  }

  const [showStartSprintModal, setShowStartSprintModal] = useState(false)
  const [showCompleteSprintModal, setShowCompleteSprintModal] = useState(false)
  const [targetSprint, setTargetSprint] = useState<Sprint | null>(null)

  const handleCreateSprint = async () => {
    if (!boardId || !board) return
    const sprintCount = (board.sprints || []).length
    await createSprint(boardId, {
      name: `Sprint ${sprintCount + 1}`,
      goal: '',
    })
    if (boardId) fetchBoard(boardId)
  }

  const handleEditSprint = async (sprintId: string) => {
    // TODO: Implement edit modal
    const name = prompt('Enter new sprint name:')
    if (name && boardId) {
      await updateSprint(boardId, sprintId, { name })
      fetchBoard(boardId)
    }
  }

  const handleDeleteSprint = async (sprintId: string) => {
    if (!boardId || !confirm('Are you sure you want to delete this sprint?')) return
    await deleteSprint(boardId, sprintId)
    fetchBoard(boardId)
  }

  const handleOpenStartSprint = (sprintId: string) => {
    const sprint = board?.sprints?.find(s => s.id === sprintId)
    if (sprint) {
      setTargetSprint(sprint)
      setShowStartSprintModal(true)
    }
  }

  const handleStartSprintSubmit = async (sprintId: string, data: { name: string; goal: string; startDate: string; endDate: string }) => {
    if (!boardId) return
    await updateSprint(boardId, sprintId, { ...data, state: 'active' })
    fetchBoard(boardId)
  }

  const handleOpenCompleteSprint = (sprintId: string) => {
    const sprint = board?.sprints?.find(s => s.id === sprintId)
    if (sprint) {
      setTargetSprint(sprint)
      setShowCompleteSprintModal(true)
    }
  }

  const handleCompleteSprintSubmit = async (sprintId: string, moveToSprintId: string | null) => {
    if (!boardId) return

    // 1. Move incomplete cards
    const incompleteCards = cards.filter(c => c.sprintId === sprintId && !c.completed)
    for (const card of incompleteCards) {
      await updateCard(card.id, {
        sprintId: moveToSprintId,
        columnId: 'Backlog' // Reset to backlog column if moving to backlog or future sprint
      })
    }

    // 2. Close the sprint
    await updateSprint(boardId, sprintId, { state: 'closed', endDate: new Date().toISOString() })
    fetchBoard(boardId)
  }

  const handleMoveCardToSprint = async (cardId: string, targetSprintId: string | null, targetIndex?: number) => {
    if (!boardId) return

    // Update card sprintId
    await updateCard(cardId, { sprintId: targetSprintId, columnId: 'Backlog' }) // Reset column to Backlog when moving to sprint/backlog

    // Handle ranking if targetIndex is provided
    if (targetIndex !== undefined) {
      // Fetch updated cards to get correct order
      const updatedCards = await fetchCards(boardId)

      // Filter cards in the target list (sprint or backlog)
      const targetList = updatedCards
        .filter(c => c.sprintId === (targetSprintId || undefined) && (!targetSprintId ? c.columnId === 'Backlog' : true))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))

      // Calculate new rank logic (similar to handleRankUpdate)
      // ... (simplified for now, just update rank)
      // For now, we rely on the list reordering which might need a separate call if we want precise ranking
    } else {
      fetchCards(boardId)
    }
  }

  useEffect(() => {
    if (boardId) {
      fetchBoard(boardId).then((board) => {
        if (board) {
          setCurrentBoard(board)
        }
      })
      fetchCards(boardId)
    }
    return () => {
      setCurrentBoard(null)
    }
  }, [boardId, fetchBoard, fetchCards, setCurrentBoard])

  useEffect(() => {
    if (board) {
      setBoardNameValue(board.name)
    }
  }, [board])

  const handleQuickCreate = async (columnId: string) => {
    if (!boardId || !quickCreateTitle.trim()) return

    // Check WIP limit
    const columnCards = getCardsForColumn(columnId)
    const limit = board?.columnLimits?.[columnId]
    if (limit && columnCards.length >= limit) {
      alert(`Cannot add card: Column "${columnId}" has reached its WIP limit of ${limit}`)
      return
    }

    setCreatingCardLoading(true)
    const card = await createCard(boardId, {
      title: quickCreateTitle.trim(),
      columnId,
      issueType: 'task',
      priority: 'medium',
    })
    setCreatingCardLoading(false)

    if (card) {
      setQuickCreateTitle('')
      setActiveColumn(null)
      // Card is automatically added to store cache
    }
  }

  const handleCreateFromModal = async (input: {
    title: string
    description?: string
    issueType: 'task' | 'bug' | 'story' | 'epic'
    priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
    labels?: string[]
    storyPoints?: number
    dueDate?: string
    assigneeId?: string
    columnId: string
  }) => {
    if (!boardId) return

    // Check WIP limit
    const columnCards = getCardsForColumn(input.columnId)
    const limit = board?.columnLimits?.[input.columnId]
    if (limit && columnCards.length >= limit) {
      alert(`Cannot add card: Column "${input.columnId}" has reached its WIP limit of ${limit}`)
      return
    }

    setCreatingCardLoading(true)
    const card = await createCard(boardId, input)
    setCreatingCardLoading(false)
    if (card) {
      setShowCreateModal(false)
      // Card is automatically added to store cache
    }
  }

  const handleMoveCard = async (cardId: string, targetColumnId: string) => {
    if (!boardId) return

    const card = cards.find((c) => c.id === cardId)
    if (!card) return
    if (card.columnId === targetColumnId) return

    // Check WIP limit for target column
    const targetColumnCards = getCardsForColumn(targetColumnId)
    const limit = board?.columnLimits?.[targetColumnId]

    // If moving from another column, don't count the card being moved
    const currentCount = card.columnId === targetColumnId
      ? targetColumnCards.length
      : targetColumnCards.length + 1

    if (limit && currentCount > limit) {
      alert(`Cannot move card: Column "${targetColumnId}" has reached its WIP limit of ${limit}`)
      return
    }

    await moveCard(cardId, targetColumnId, boardId)
    // Card is automatically updated in store cache
  }

  const handleReorderColumns = async (columnId: string, targetIndex: number) => {
    if (!boardId || !board) return

    const currentIndex = board.columns.indexOf(columnId)
    if (currentIndex === -1 || currentIndex === targetIndex) return

    const newColumns = [...board.columns]
    const [movedColumn] = newColumns.splice(currentIndex, 1)
    newColumns.splice(targetIndex, 0, movedColumn)

    await updateBoard(boardId, { columns: newColumns })
    if (boardId) fetchBoard(boardId)
  }

  const handleUpdateBoardName = async () => {
    if (!boardId || !boardNameValue.trim()) return

    const updated = await updateBoard(boardId, { name: boardNameValue.trim() })

    if (updated) {
      setEditingBoardName(false)
      setCurrentBoard(updated)
      // Board is automatically updated in store
    }
  }

  const handleDeleteBoard = async () => {
    if (!boardId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this board? All cards will be deleted. This action cannot be undone.',
    )

    if (confirmed) {
      const success = await deleteBoard(boardId)

      if (success) {
        setCurrentBoard(null)
        navigate('/workspace')
        // Board is automatically removed from store
      }
    }
  }

  const handleAddColumn = async () => {
    if (!boardId || !board || !newColumnName.trim()) return
    const updatedColumns = [...board.columns, newColumnName.trim()]
    const updated = await updateBoard(boardId, { columns: updatedColumns })
    if (updated) {
      setNewColumnName('')
      setCurrentBoard(updated)
    }
  }

  const handleDeleteColumn = async (columnName: string) => {
    if (!boardId || !board) return
    if (board.columns.length <= 1) {
      alert('Cannot delete the last column')
      return
    }
    const confirmed = window.confirm(`Delete column "${columnName}"? Cards in this column will be moved to the first column.`)
    if (!confirmed) return

    const columnCards = cards.filter(c => c.columnId === columnName)
    const firstColumn = board.columns.find(col => col !== columnName) || board.columns[0]

    // Move cards to first column
    for (const card of columnCards) {
      await updateCard(card.id, { columnId: firstColumn })
    }

    const updatedColumns = board.columns.filter(col => col !== columnName)
    const updated = await updateBoard(boardId, { columns: updatedColumns })
    if (updated) {
      setCurrentBoard(updated)
      // Cards are automatically updated in store
    }
  }

  const handleRenameColumn = async (oldName: string, newName: string) => {
    if (!boardId || !board || !newName.trim() || newName === oldName) {
      setEditingColumn(null)
      setNewColumnName('')
      return
    }

    // Update cards in this column
    const columnCards = cards.filter(c => c.columnId === oldName)
    for (const card of columnCards) {
      await updateCard(card.id, { columnId: newName.trim() })
    }

    // Update board columns
    const updatedColumns = board.columns.map(col => col === oldName ? newName.trim() : col)
    const updated = await updateBoard(boardId, { columns: updatedColumns })
    if (updated) {
      setEditingColumn(null)
      setNewColumnName('')
      setCurrentBoard(updated)
      // Cards are automatically updated in store
    }
  }

  const handleUpdateCard = async (updates: any) => {
    if (!selectedCard || !boardId) return
    const updated = await updateCard(selectedCard.id, updates)
    if (updated) {
      setSelectedCard(updated)
      // Card is automatically updated in store cache
    }
  }

  const handleDeleteCard = async () => {
    if (!selectedCard || !boardId) return
    const confirmed = window.confirm('Are you sure you want to delete this card?')
    if (confirmed) {
      const success = await deleteCard(selectedCard.id, boardId)
      if (success) {
        setSelectedCard(null)
        // Card is automatically removed from store cache
      }
    }
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    )
  }

  const filteredCards = searchQuery
    ? cards.filter((card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    : cards

  const getCardsForColumn = (columnId: string): CardType[] => {
    return filteredCards.filter((card) => {
      // For sprint boards, exclude backlog items from board columns
      if (board.type === 'sprint') {
        if (card.columnId === 'Backlog') return false

        // Only show cards from the active sprint
        const activeSprint = board.sprints?.find(s => s.state === 'active')
        if (activeSprint && card.sprintId !== activeSprint.id) return false
        if (!activeSprint && card.sprintId) return false // If no active sprint, hide sprint cards? Or show all? Usually hide.
      }
      return card.columnId === columnId
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="space-y-4">
          {/* Top row: Back button and title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')} className="h-8 sm:h-9 flex-shrink-0">
              <span className="hidden sm:inline">← Back</span>
              <span className="sm:hidden">←</span>
            </Button>
            {!editingBoardName ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold truncate">{board.name}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingBoardName(true)}
                  className="h-7 w-7 p-0 flex-shrink-0"
                >
                  ✎
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  value={boardNameValue}
                  onChange={(e) => setBoardNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateBoardName()
                    if (e.key === 'Escape') {
                      setEditingBoardName(false)
                      setBoardNameValue(board.name)
                    }
                  }}
                  autoFocus
                  className="h-9 text-base sm:text-lg"
                />
                <Button size="sm" onClick={handleUpdateBoardName} className="h-9 flex-shrink-0">
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingBoardName(false)
                    setBoardNameValue(board.name)
                  }}
                  className="h-9 flex-shrink-0"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Board metadata */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span>
              {board.type === 'kanban' ? 'Kanban' : 'Sprint'} · {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            </span>
            {board.type === 'sprint' && board.sprintStartDate && board.sprintEndDate && (
              <span className="hidden sm:inline">
                {new Date(board.sprintStartDate).toLocaleDateString()} -{' '}
                {new Date(board.sprintEndDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Action buttons - Mobile optimized */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Primary actions row */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-9 flex-shrink-0">
                + Create
              </Button>
              <Input
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 h-9"
              />
              {board.type === 'sprint' && (
                <Button
                  variant={viewMode === 'backlog' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'board' ? 'backlog' : 'board')}
                  className="h-9 flex-shrink-0"
                >
                  {viewMode === 'board' ? 'Backlog' : 'Board'}
                </Button>
              )}
            </div>

            {/* Secondary actions - wrap on mobile */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMembersModal(true)}
                className="h-9 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">👥 Members</span>
                <span className="sm:hidden">👥</span>
              </Button>
              {board.type === 'kanban' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetrics(!showMetrics)}
                  className="h-9 text-xs sm:text-sm"
                >
                  Metrics
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="h-9 text-xs sm:text-sm"
              >
                Columns
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteBoard}
                className="h-9 text-xs sm:text-sm"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'backlog' ? (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Epic Panel Sidebar */}
          {epics.length > 0 && (
            <div className="w-full lg:w-64 flex-shrink-0">
              <EpicPanel
                epics={epics}
                cardsByEpic={cardsByEpic}
                selectedEpicId={backlogFilters.epicId}
                onEpicSelect={(epicId) => setBacklogFilters({ ...backlogFilters, epicId })}
                onEpicClick={(epic) => setSelectedCard(epic)}
              />
            </div>
          )}

          {/* Main Backlog Content */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold">Backlog</h2>
                <span className="text-xs text-muted-foreground">
                  {filteredBacklogCards.length} issues
                </span>
              </div>
              <Button size="sm" onClick={handleCreateSprint}>
                Create Sprint
              </Button>
            </div>

            {/* Filters */}
            <BacklogFilters
              cards={backlogCards}
              epics={epics}
              users={
                board
                  ? (users || []).filter(
                    (u) => u.id === board.ownerId || board.memberIds.includes(u.id)
                  )
                  : users || []
              }
              filters={backlogFilters}
              onFiltersChange={setBacklogFilters}
            />

            {/* Sprints */}
            <div className="space-y-4">
              {board.sprints?.filter(s => s.state !== 'closed').map(sprint => (
                <SprintList
                  key={sprint.id}
                  sprint={sprint}
                  cards={cards.filter(c => c.sprintId === sprint.id)}
                  users={users || []}
                  selectedCardIds={selectedCardIds}
                  onSelectCard={handleCardSelect}
                  onCardClick={(card) => setSelectedCard(card)}
                  onFlagToggle={handleFlagToggle}
                  onMoveCard={handleMoveCardToSprint}
                  onEditSprint={handleEditSprint}
                  onDeleteSprint={handleDeleteSprint}
                  onStartSprint={handleOpenStartSprint}
                  onCompleteSprint={handleOpenCompleteSprint}
                />
              ))}
            </div>

            {/* Backlog List (No Sprint) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-medium text-muted-foreground">Backlog</h3>
                <StoryPointsSummary cards={filteredBacklogCards.filter(c => !c.sprintId)} />
              </div>

              <DroppableList
                id="backlog-list"
                onDrop={(cardId, targetIndex) => {
                  handleMoveCardToSprint(cardId, null, targetIndex)
                }}
                className="min-h-[100px] bg-muted/5 rounded-lg border border-dashed border-border/50 p-2"
              >
                {filteredBacklogCards
                  .filter(c => !c.sprintId)
                  .map((card) => {
                    const epic = card.epicId ? epics.find((e) => e.id === card.epicId) : undefined
                    return (
                      <BacklogItem
                        key={card.id}
                        card={card}
                        epic={epic}
                        users={users || []}
                        isSelected={selectedCardIds.has(card.id)}
                        onSelect={handleCardSelect}
                        onClick={() => setSelectedCard(card)}
                        onFlagToggle={handleFlagToggle}
                        columns={board?.columns || []}
                        onMoveToColumn={handleMoveCard}
                      />
                    )
                  })}
              </DroppableList>

              {filteredBacklogCards.filter(c => !c.sprintId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Backlog is empty
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 w-full">
          {showColumnSettings && (
            <Card className="p-4 bg-muted/30 border-border/50">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Manage Columns</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowColumnSettings(false)} className="h-6 w-6 p-0">
                    ×
                  </Button>
                </div>
                <DroppableColumnContainer
                  onColumnDrop={async (columnId, targetIndex) => {
                    if (!boardId || !board) return
                    const currentIndex = board.columns.indexOf(columnId)
                    if (currentIndex === -1 || currentIndex === targetIndex) return
                    const newColumns = [...board.columns]
                    const [movedColumn] = newColumns.splice(currentIndex, 1)
                    newColumns.splice(targetIndex, 0, movedColumn)
                    await updateBoard(boardId, { columns: newColumns })
                    if (boardId) fetchBoard(boardId)
                  }}
                  className="flex-col space-y-2"
                >
                  {board.columns.map((column, idx) => (
                    <DraggableColumn
                      key={column}
                      id={column}
                      onDragEnd={() => { }}
                    >
                      <div className="group flex items-center gap-3 p-3 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-medium text-muted-foreground w-6">#{idx + 1}</span>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        </div>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-[75%] flex-shrink-0">
                            {editingColumn === column ? (
                              <Input
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onBlur={() => {
                                  if (newColumnName.trim() && newColumnName.trim() !== column) {
                                    handleRenameColumn(column, newColumnName.trim())
                                  } else {
                                    setEditingColumn(null)
                                    setNewColumnName('')
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newColumnName.trim()) {
                                    if (newColumnName.trim() !== column) {
                                      handleRenameColumn(column, newColumnName.trim())
                                    } else {
                                      setEditingColumn(null)
                                      setNewColumnName('')
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingColumn(null)
                                    setNewColumnName('')
                                  }
                                }}
                                className="h-8 text-sm w-full"
                                autoFocus
                              />
                            ) : (
                              <span
                                className="text-sm font-medium w-full block cursor-pointer hover:text-primary transition-colors truncate"
                                onClick={() => {
                                  setEditingColumn(column)
                                  setNewColumnName(column)
                                }}
                                title={column}
                              >
                                {column}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Limit:</span>
                            <Input
                              type="number"
                              placeholder="No limit"
                              value={board.columnLimits?.[column] || ''}
                              onChange={(e) => {
                                const limit = e.target.value ? Number(e.target.value) : undefined
                                const newLimits = { ...board.columnLimits }
                                if (limit && limit > 0) {
                                  newLimits[column] = limit
                                } else {
                                  delete newLimits[column]
                                }
                                updateBoard(board.id, { columnLimits: Object.keys(newLimits).length > 0 ? newLimits : undefined }).then(() => {
                                  if (boardId) fetchBoard(boardId)
                                })
                              }}
                              className="h-7 w-16 text-xs"
                              min="1"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteColumn(column)}
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={board.columns.length <= 1}
                            title="Delete column"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </DraggableColumn>
                  ))}
                </DroppableColumnContainer>
                <div className="flex gap-2 pt-3 border-t">
                  <Input
                    placeholder="New column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newColumnName.trim()) {
                        handleAddColumn()
                      }
                    }}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim() || creatingCardLoading}
                    className="h-9 text-sm"
                  >
                    Add Column
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {showMetrics && board.type === 'kanban' && (
            <KanbanMetricsPanel board={board} cards={cards} />
          )}
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.2) transparent' }}>
            <DroppableColumnContainer
              onColumnDrop={handleReorderColumns}
            >
              {board.columns.map((column) => {
                const columnCards = getCardsForColumn(column)
                const isActive = activeColumn === column
                const wipStatus = getWipStatus(columnCards.length, board?.columnLimits?.[column])

                return (
                  <div
                    key={column}
                    className="flex-shrink-0 w-[320px]"
                  >
                    <DroppableColumn
                      id={column}
                      onDrop={async (cardId, targetColumnId) => {
                        await handleMoveCard(cardId, targetColumnId)
                      }}
                      disabled={!!(board?.columnLimits?.[column] &&
                        getCardsForColumn(column).length >= board.columnLimits[column])}
                      className="h-full"
                    >
                      <div className="bg-muted/30 backdrop-blur-sm border border-border/30 rounded-xl p-2 space-y-1.5 min-h-[400px] shadow-sm h-full">
                        <DraggableColumn
                          id={column}
                          className="mb-1.5 pb-1.5 border-b border-border/50"
                        >
                          <div className="flex items-center justify-between group/column">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover/column:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0" />
                              <h2 className="font-semibold text-sm text-foreground truncate" title={column}>{column}</h2>
                            </div>
                            <span
                              className={cn(
                                'text-xs bg-background px-1.5 py-0.5 rounded',
                                wipStatus === 'exceeded' && 'text-red-600 font-semibold',
                                wipStatus === 'warning' && 'text-orange-600 font-semibold',
                                wipStatus === 'ok' && 'text-muted-foreground'
                              )}
                            >
                              {columnCards.length}
                              {board.columnLimits?.[column] && ` / ${board.columnLimits[column]}`}
                            </span>
                          </div>
                        </DraggableColumn>

                        <div className="space-y-1.5">
                          {columnCards.map((card) => (
                            <DraggableCard key={card.id} id={card.id} onDragEnd={() => boardId && fetchCards(boardId)}>
                              <Card
                                className={cn(
                                  "p-3 hover:shadow-lg transition-all duration-300 bg-background/90 border-border/60 cursor-pointer group rounded-lg min-h-[100px] flex flex-col",
                                  card.completed && "opacity-60"
                                )}
                                onClick={() => setSelectedCard(card)}
                              >
                                <CardContent className="p-0 flex flex-col">
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex items-start gap-2">
                                      <input
                                        type="checkbox"
                                        checked={card.completed}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          updateCard(card.id, { completed: !card.completed }).then(() => {
                                            if (boardId) fetchCards(boardId)
                                          })
                                        }}
                                        className="mt-0.5 flex-shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-1">
                                          <p className={cn(
                                            "text-sm leading-tight font-semibold line-clamp-1 mb-1 flex-1",
                                            card.completed ? "text-muted-foreground line-through" : "text-foreground"
                                          )}>
                                            {card.title}
                                          </p>
                                          {board?.type === 'sprint' && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 -mt-0.5"
                                                title="Move to Backlog"
                                              >
                                                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleMoveCard(card.id, 'Backlog')
                                                  }}
                                                  className="cursor-pointer"
                                                >
                                                  Move to Backlog
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {card.attachments && card.attachments.length > 0 && card.attachments[0].mimetype?.startsWith('image/') && (
                                      <div className="rounded overflow-hidden -mx-1">
                                        <img
                                          src={card.attachments[0].url || `${axiosInstance.defaults.baseURL}${GET_CARD_FILE(card.attachments[0].filename)}`}
                                          alt={card.attachments[0].originalName}
                                          className="w-full h-20 object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    )}

                                    {card.description && (
                                      <p className={cn(
                                        "text-xs leading-relaxed line-clamp-2",
                                        card.completed ? "text-muted-foreground/70" : "text-muted-foreground"
                                      )}>
                                        {stripHtml(card.description)}
                                      </p>
                                    )}

                                    {card.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        {card.labels.slice(0, 3).map((label) => (
                                          <Badge key={label} variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/50 border-border/60">
                                            {label}
                                          </Badge>
                                        ))}
                                        {card.labels.length > 3 && (
                                          <span className="text-[10px] text-muted-foreground">+{card.labels.length - 3}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 mt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`h-2 w-2 rounded-full ${ISSUE_TYPE_DOT_COLORS[card.issueType] || 'bg-gray-500'}`}></div>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${ISSUE_TYPE_COLORS[card.issueType]}`}>
                                          {card.issueType}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${PRIORITY_COLORS[card.priority]}`}>
                                          {card.priority}
                                        </Badge>
                                        {card.storyPoints && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                            {card.storyPoints}pts
                                          </Badge>
                                        )}
                                        {card.dueDate && new Date(card.dueDate) < new Date() && (
                                          <span className="text-[10px] text-red-500">⚠</span>
                                        )}
                                      </div>
                                      {card.assigneeId && (
                                        <UserAvatar userId={card.assigneeId} users={users} size="sm" />
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </DraggableCard>
                          ))}

                          {!isActive ? (
                            !(board?.columnLimits?.[column] && columnCards.length >= board.columnLimits[column]) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs mt-1"
                                onClick={() => setActiveColumn(column)}
                              >
                                + Add task
                              </Button>
                            )
                          ) : (
                            !(board?.columnLimits?.[column] && columnCards.length >= board.columnLimits[column]) && (
                              <Card className="p-2 border-2 border-primary/20 bg-card mt-1">
                                <CardContent className="p-0">
                                  <Input
                                    placeholder="Issue title"
                                    value={quickCreateTitle}
                                    onChange={(e) => setQuickCreateTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && quickCreateTitle.trim()) {
                                        handleQuickCreate(column)
                                      }
                                      if (e.key === 'Escape') {
                                        setActiveColumn(null)
                                        setQuickCreateTitle('')
                                      }
                                    }}
                                    autoFocus
                                    className="h-8 text-xs mb-2"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuickCreate(column)}
                                      disabled={!quickCreateTitle.trim() || creatingCardLoading}
                                      className="h-7 text-xs flex-1"
                                    >
                                      Create
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setActiveColumn(null)
                                        setQuickCreateTitle('')
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </div>
                    </DroppableColumn>
                  </div>
                )
              })}
            </DroppableColumnContainer>
          </div>
        </div>
      )}

      <CreateIssueModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFromModal}
        boardColumns={board?.columns || []}
        board={board}
      />

      <CardDetailDrawer
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={handleUpdateCard}
        onDelete={handleDeleteCard}
      />

      <BoardMembersModal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        board={board}
        onUpdate={async (memberIds) => {
          await updateBoard(board.id, { memberIds })
          if (boardId) {
            await fetchBoard(boardId)
          }
        }}
      />
      <StartSprintModal
        isOpen={showStartSprintModal}
        onClose={() => setShowStartSprintModal(false)}
        sprint={targetSprint}
        onStart={handleStartSprintSubmit}
      />

      <CompleteSprintModal
        isOpen={showCompleteSprintModal}
        onClose={() => setShowCompleteSprintModal(false)}
        sprint={targetSprint}
        cards={cards.filter(c => c.sprintId === targetSprint?.id)}
        onComplete={handleCompleteSprintSubmit}
        availableSprints={board.sprints || []}
      />
    </div>
  )
}
