import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DraggableCard, DroppableColumn } from '@/components/dnd'
import { UserAvatar } from '@/components/ui/user-selector'
import { useBoardStore } from '@/stores/board.store'
import { useUsers } from '@/hooks/user.hooks'
import { cn } from '@/utils/cn'
import type { Card as CardType } from '@/types/board'
import { CreateIssueModal } from './components/CreateIssueModal'
import { CardDetailDrawer } from './components/CardDetailDrawer'
import { BoardMembersModal } from './components/BoardMembersModal'

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
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [newColumnName, setNewColumnName] = useState('')

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
    if (card?.columnId === targetColumnId) return

    await moveCard(cardId, targetColumnId, boardId)
    // Card is automatically updated in store cache
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
    if (!boardId || !board || !newName.trim() || newName === oldName) return
    
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
    return filteredCards.filter((card) => card.columnId === columnId && !card.completed)
  }

  return (
    <div className="space-y-1">
      <div className="pb-1 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')} className="mb-1">
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {!editingBoardName ? (
                <>
                  <h1 className="text-xl font-semibold truncate">{board.name}</h1>
                  <Button variant="ghost" size="sm" onClick={() => setEditingBoardName(true)} className="h-6 w-6 p-0">
                    ✎
                  </Button>
                </>
              ) : (
                <>
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
                    className="h-8 text-lg"
                  />
                  <Button size="sm" onClick={handleUpdateBoardName} className="h-8">
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingBoardName(false)
                      setBoardNameValue(board.name)
                    }}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">
                {board.type === 'kanban' ? 'Kanban' : 'Sprint'} · {cards.length} cards
              </span>
              {board.type === 'sprint' && board.sprintStartDate && board.sprintEndDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(board.sprintStartDate).toLocaleDateString()} -{' '}
                  {new Date(board.sprintEndDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-[34px]">
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-8">
            + Create
          </Button>
          <Input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-8"
          />
          {board.type === 'sprint' && (
            <Button
              variant={viewMode === 'backlog' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'board' ? 'backlog' : 'board')}
              className="h-8"
            >
              {viewMode === 'board' ? 'Backlog' : 'Board'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMembersModal(true)}
            className="h-8"
          >
            👥 Members
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="h-8"
          >
            Columns
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteBoard} className="h-8">
            Delete
          </Button>
        </div>
        </div>
      </div>

      {viewMode === 'backlog' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="text-sm font-semibold">Backlog</h2>
            <span className="text-xs text-muted-foreground">
              {cards.filter((c) => c.columnId === 'Backlog' || board.columns[0] === c.columnId).length} items
            </span>
          </div>
          <div className="space-y-2">
            {cards
              .filter((c) => c.columnId === 'Backlog' || board.columns[0] === c.columnId)
              .map((card) => (
                <Card
                  key={card.id}
                  className="p-3 hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50 cursor-pointer rounded-xl"
                  onClick={() => setSelectedCard(card)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{card.title}</p>
                        {card.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 items-center">
                          <Badge variant="outline" className={`text-[10px] ${ISSUE_TYPE_COLORS[card.issueType]}`}>
                            {card.issueType}
                          </Badge>
                          {card.priority !== 'medium' && (
                            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[card.priority]}`}>
                              {card.priority}
                            </Badge>
                          )}
                          {card.storyPoints && (
                            <Badge variant="outline" className="text-[10px]">
                              {card.storyPoints} pts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {cards.filter((c) => c.columnId === 'Backlog' || board.columns[0] === c.columnId).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Backlog is empty</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {showColumnSettings && (
            <Card className="p-3 bg-muted/30">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Manage Columns</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowColumnSettings(false)} className="h-6 w-6 p-0">
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  {board.columns.map((column, idx) => (
                    <div key={column} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1 space-y-2">
                        {editingColumn === column ? (
                          <>
                            <Input
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newColumnName.trim()) {
                                  handleRenameColumn(column, newColumnName.trim())
                                }
                                if (e.key === 'Escape') {
                                  setEditingColumn(null)
                                  setNewColumnName('')
                                }
                              }}
                              className="h-8 text-xs mb-2"
                              autoFocus
                            />
                            <Input
                              type="number"
                              placeholder="WIP Limit (optional)"
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
                              className="h-8 text-xs"
                              min="1"
                            />
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                onClick={() => handleRenameColumn(column, newColumnName.trim())}
                                className="h-7 text-xs flex-1"
                                disabled={!newColumnName.trim() || newColumnName === column}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingColumn(null)
                                  setNewColumnName('')
                                }}
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                              <span className="text-sm font-medium flex-1">{column}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Limit:</span>
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
                                className="h-7 w-20 text-xs"
                                min="1"
                              />
                            </div>
                            <div className="flex gap-1 mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingColumn(column)
                                  setNewColumnName(column)
                                }}
                                className="h-7 text-xs flex-1"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteColumn(column)}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                disabled={board.columns.length <= 1}
                              >
                                Delete
                              </Button>
                              {idx > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newColumns = [...board.columns]
                                    ;[newColumns[idx], newColumns[idx - 1]] = [newColumns[idx - 1], newColumns[idx]]
                                    updateBoard(board.id, { columns: newColumns })
                                    if (boardId) fetchBoard(boardId)
                                  }}
                                  className="h-7 w-7 text-xs p-0"
                                  title="Move left"
                                >
                                  ←
                                </Button>
                              )}
                              {idx < board.columns.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newColumns = [...board.columns]
                                    ;[newColumns[idx], newColumns[idx + 1]] = [newColumns[idx + 1], newColumns[idx]]
                                    updateBoard(board.id, { columns: newColumns })
                                    if (boardId) fetchBoard(boardId)
                                  }}
                                  className="h-7 w-7 text-xs p-0"
                                  title="Move right"
                                >
                                  →
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="New column name"
                    value={editingColumn ? '' : newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newColumnName.trim() && !editingColumn) {
                        handleAddColumn()
                      }
                    }}
                    className="flex-1 h-8 text-xs"
                    disabled={!!editingColumn}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddColumn}
                    disabled={!newColumnName.trim() || !!editingColumn || creatingCardLoading}
                    className="h-8 text-xs"
                  >
                    Add Column
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {board.columns.map((column) => {
            const columnCards = getCardsForColumn(column)
            const isActive = activeColumn === column

            return (
              <DroppableColumn
                key={column}
                id={column}
                onDrop={async (cardId, targetColumnId) => {
                  await handleMoveCard(cardId, targetColumnId)
                }}
                className="flex-shrink-0 min-w-[260px]"
              >
                <div className="bg-muted/30 backdrop-blur-sm border border-border/30 rounded-xl p-1.5 space-y-1 min-h-[300px] shadow-sm">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b">
                    <h2 className="font-semibold text-xs text-foreground">{column}</h2>
                    <span
                      className={cn(
                        'text-xs bg-background px-1.5 py-0.5 rounded',
                        board.columnLimits?.[column] &&
                          columnCards.length >= board.columnLimits[column]
                          ? 'text-red-600 font-semibold'
                          : 'text-muted-foreground'
                      )}
                    >
                      {columnCards.length}
                      {board.columnLimits?.[column] && ` / ${board.columnLimits[column]}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {columnCards.map((card) => (
                      <DraggableCard key={card.id} id={card.id} onDragEnd={() => boardId && fetchCards(boardId)}>
                        <Card
                          className="p-2 hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50 cursor-pointer group rounded-xl"
                          onClick={() => setSelectedCard(card)}
                        >
                          <CardContent className="p-0">
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-1">
                                <input
                                  type="checkbox"
                                  checked={card.completed}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateCard(card.id, { completed: !card.completed }).then(() => {
                                      if (boardId) fetchCards(boardId)
                                    })
                                  }}
                                  className="mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <p className="text-xs text-foreground leading-tight flex-1 line-clamp-2">
                                  {card.title}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-0.5 items-center justify-between">
                                <div className="flex flex-wrap gap-0.5 items-center">
                                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${ISSUE_TYPE_COLORS[card.issueType]}`}>
                                    {card.issueType.charAt(0).toUpperCase()}
                                  </Badge>
                                  {card.priority !== 'medium' && (
                                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${PRIORITY_COLORS[card.priority]}`}>
                                      {card.priority.charAt(0).toUpperCase()}
                                    </Badge>
                                  )}
                                  {card.labels.slice(0, 2).map((label) => (
                                    <Badge key={label} variant="outline" className="text-[10px] px-1 py-0">
                                      {label}
                                    </Badge>
                                  ))}
                                  {card.labels.length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">+{card.labels.length - 2}</span>
                                  )}
                                  {card.storyPoints && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground h-7 text-xs"
                        onClick={() => setActiveColumn(column)}
                      >
                        + Quick create
                      </Button>
                    ) : (
                      <Card className="p-2 border-2 border-primary/20 bg-card">
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
                            className="h-7 text-xs mb-2"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleQuickCreate(column)}
                              disabled={!quickCreateTitle.trim() || creatingCardLoading}
                              className="h-6 text-xs flex-1"
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
                              className="h-6 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </DroppableColumn>
            )
          })}
          </div>
        </div>
      )}

      <CreateIssueModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFromModal}
        boardColumns={board?.columns || []}
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
    </div>
  )
}
