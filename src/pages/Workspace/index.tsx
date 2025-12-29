import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Star, MoreHorizontal, ChevronLeft, ChevronRight, LayoutGrid, Zap, Pencil, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateBoardModal } from './components/CreateBoardModal'
import { EditBoardModal } from './components/EditBoardModal'
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal'
import { useToggleBoardFavorite } from '@/hooks/board.hooks'
import { useBoardsQuery, useBoardsQueryActions } from '@/hooks/queries/board.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import type { Board as ApiBoard } from '@/types/board'
import type { User } from '@/types/user'
import { useSocketStore } from '@/stores/socket.store'
import { BoardSocketEvents } from '@/hooks/socket/board.socket'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

// Types for Board Display
type BoardType = 'kanban' | 'sprint'
type BoardRole = 'owner' | 'admin' | 'member' | 'viewer' | 'none'

type BoardDisplay = {
  id: string
  name: string
  key: string
  type: BoardType
  lead: {
    id: string
    name: string
    avatar?: string
    initials: string
    color: string
  }
  icon: string // emoji
  starred: boolean
}

// Helper to convert backend Board to display format
function convertBoardToDisplay(board: ApiBoard, allUsers: User[]): BoardDisplay {
  // Use the board creator as the lead/owner
  const leadUser = board.createdBy ? allUsers.find((u) => u.id === board.createdBy) : null
  
  const initials = leadUser?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U'

  // Generate color based on initials
  const colors = [
    'bg-purple-500', 'bg-amber-500', 'bg-blue-500', 'bg-teal-500',
    'bg-rose-500', 'bg-fuchsia-500', 'bg-slate-500', 'bg-lime-500',
    'bg-orange-500', 'bg-cyan-500'
  ]
  const colorIndex = initials.charCodeAt(0) % colors.length

  return {
    id: board.id,
    name: board.name,
    key: board.prefix || board.name.substring(0, 10).toUpperCase().replace(/\s+/g, ''),
    type: board.type,
    lead: {
      id: board.createdBy || '',
      name: leadUser?.name || 'Unknown',
      avatar: leadUser?.profilePic,
      initials,
      color: colors[colorIndex],
    },
    icon: board.emoji || '📋',
    starred: board.isFavorite ?? false,
  }
}

const ITEMS_PER_PAGE = 8

// Memoized helper function for board type icons
const getBoardTypeIcon = (type: BoardType) => {
  switch (type) {
    case 'kanban':
      return <LayoutGrid className="h-4 w-4 text-blue-500" />
    case 'sprint':
      return <Zap className="h-4 w-4 text-purple-500" />
    default:
      return <LayoutGrid className="h-4 w-4 text-gray-500" />
  }
}

const GLOBAL_WORKSPACE_ID = 'global' as const

export function Workspace() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<BoardDisplay | null>(null)
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const hasBoardFullAccess = can(PERMISSIONS.BOARD_FULL_ACCESS)
  const canCreateBoard = hasBoardFullAccess || can(PERMISSIONS.BOARD_CREATE)
  
  // Fetch boards using TanStack Query (cached across navigation)
  const { data: boards = [], isLoading } = useBoardsQuery()
  const { updateBoardInCache, addBoardToCache, removeBoardFromCache } = useBoardsQueryActions()
  
  // Only show loading skeleton if we have NO data (first load)
  // If we have cached data, show it immediately even if refetching
  const showLoadingSkeleton = isLoading && boards.length === 0
  const { toggleFavorite: toggleFavoriteApi } = useToggleBoardFavorite()
  
  // Fetch users for lead display (cached)
  const { data: allUsers = [] } = useUsersQuery()

  const getBoardRole = useCallback(
    (boardId: string): BoardRole => {
      if (!user?.id) return 'none'
      const target = boards.find((b) => b.id === boardId)
      if (!target) return 'none'
      if (target.createdBy === user.id) return 'owner'
      const memberRole = target.members.find((m) => m.userId === user.id)?.role
      return (memberRole as BoardRole) || 'none'
    },
    [boards, user?.id],
  )

  const canUpdateBoard = useCallback(
    (boardId: string) => {
      const role = getBoardRole(boardId)
      return hasBoardFullAccess || role === 'owner' || role === 'admin'
    },
    [getBoardRole, hasBoardFullAccess],
  )

  const canDeleteBoard = useCallback(
    (boardId: string) => {
      const role = getBoardRole(boardId)
      return hasBoardFullAccess || role === 'owner' || can(PERMISSIONS.BOARD_DELETE)
    },
    [can, getBoardRole, hasBoardFullAccess],
  )

  const canFavoriteBoard = useCallback(
    (boardId: string) => {
      const role = getBoardRole(boardId)
      return hasBoardFullAccess || role !== 'none'
    },
    [getBoardRole, hasBoardFullAccess],
  )

  // Socket connection for real-time updates
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)
  const workspaceJoinedRef = useRef(false)

  // Join global board room for real-time events
  useEffect(() => {
    if (!socket || !connected) {
      workspaceJoinedRef.current = false
      return
    }
    if (workspaceJoinedRef.current) return // already joined

    socket.emit('workspace:join', GLOBAL_WORKSPACE_ID)
    workspaceJoinedRef.current = true

    return () => {
      socket.emit('workspace:leave', GLOBAL_WORKSPACE_ID)
      workspaceJoinedRef.current = false
    }
  }, [socket, connected])

  // Listen for board socket events
  useEffect(() => {
    if (!socket || !connected) return

    const handleBoardCreated = (data: { board: ApiBoard; userId: string; timestamp: string }) => {
      addBoardToCache(data.board)
    }

    const handleBoardUpdated = (data: { board: ApiBoard; userId: string; timestamp: string }) => {
      updateBoardInCache(data.board.id, () => data.board)
    }

    const handleBoardDeleted = (data: { boardId: string; userId: string; timestamp: string }) => {
      removeBoardFromCache(data.boardId)
    }

    const handleBoardFavoriteToggled = (data: { boardId: string; userId: string; isFavorite: boolean; timestamp: string }) => {
      // Update the board's favorite status in cache
      updateBoardInCache(data.boardId, (board) => ({ ...board, isFavorite: data.isFavorite }))
    }

    socket.on(BoardSocketEvents.CREATED, handleBoardCreated)
    socket.on(BoardSocketEvents.UPDATED, handleBoardUpdated)
    socket.on(BoardSocketEvents.DELETED, handleBoardDeleted)
    socket.on(BoardSocketEvents.FAVORITE_TOGGLED, handleBoardFavoriteToggled)

    return () => {
      socket.off(BoardSocketEvents.CREATED, handleBoardCreated)
      socket.off(BoardSocketEvents.UPDATED, handleBoardUpdated)
      socket.off(BoardSocketEvents.DELETED, handleBoardDeleted)
      socket.off(BoardSocketEvents.FAVORITE_TOGGLED, handleBoardFavoriteToggled)
    }
  }, [socket, connected, addBoardToCache, updateBoardInCache, removeBoardFromCache])

  // Convert backend boards to display format
  const displayBoards = useMemo(() => {
    return boards.map((board) => {
      const display = convertBoardToDisplay(board, allUsers)
      display.starred = board.isFavorite ?? false
      return display
    })
  }, [boards, allUsers])

  // Initialize starred boards from backend data (computed from displayBoards)
  const starredBoards = useMemo(() => {
    const favoriteSet = new Set<string>()
    displayBoards.forEach(board => {
      if (board.starred) {
        favoriteSet.add(board.id)
      }
    })
    return favoriteSet
  }, [displayBoards])

  // Navigate to board view
  const handleBoardClick = (board: BoardDisplay) => {
    navigate(`/workspace/${board.key.toLowerCase()}`)
  }

  // Filter and sort boards: favorites first (alphabetical), then non-favorites (alphabetical)
  const filteredBoards = useMemo(() => {
    let result = displayBoards

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (board) =>
          board.name.toLowerCase().includes(query) ||
          board.key.toLowerCase().includes(query) ||
          board.lead.name.toLowerCase().includes(query)
      )
    }

    // Sort: starred first (alphabetical), then non-starred (alphabetical)
    return result.sort((a, b) => {
      const aStarred = starredBoards.has(a.id)
      const bStarred = starredBoards.has(b.id)
      // If both have same starred status, sort alphabetically
      if (aStarred === bStarred) {
        return a.name.localeCompare(b.name)
      }
      // Starred items come first
      return aStarred ? -1 : 1
    })
  }, [displayBoards, searchQuery, starredBoards])

  // Pagination
  const totalPages = Math.ceil(filteredBoards.length / ITEMS_PER_PAGE)
  const paginatedBoards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredBoards.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredBoards, currentPage])

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // Toggle star - sync with backend
  const toggleStar = async (id: string) => {
    if (!canFavoriteBoard(id)) return
    const board = boards.find(b => b.id === id)
    if (!board) return

    const currentFavoriteStatus = board.isFavorite ?? false
    const newFavoriteStatus = !currentFavoriteStatus

    // Optimistically update cache
    updateBoardInCache(id, (b) => ({ ...b, isFavorite: newFavoriteStatus }))

    // Update backend
    const result = await toggleFavoriteApi(id)
    if (!result) {
      // On error, revert to previous state
      updateBoardInCache(id, (b) => ({ ...b, isFavorite: currentFavoriteStatus }))
    }
  }

  // Handle create board
  const handleCreateBoard = () => {
    // Socket will handle the update via handleBoardCreated
    setCreateModalOpen(false)
  }

  // Handle edit board
  const handleEditBoard = (board: BoardDisplay) => {
    if (!canUpdateBoard(board.id)) return
    setSelectedBoard(board)
    setEditModalOpen(true)
  }

  const handleSaveEdit = (updatedBoard: ApiBoard | null) => {
    // Update cache with the updated board
    if (updatedBoard) {
      updateBoardInCache(updatedBoard.id, () => updatedBoard)
    }
    setEditModalOpen(false)
    setSelectedBoard(null)
  }

  // Handle delete board
  const handleDeleteBoard = (board: BoardDisplay) => {
    if (!canDeleteBoard(board.id)) return
    setSelectedBoard(board)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = (boardId: string) => {
    // Remove from cache
    removeBoardFromCache(boardId)
    setDeleteModalOpen(false)
    setSelectedBoard(null)
  }

  if (showLoadingSkeleton) {
    return (
      <section className="space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </header>

        {/* Search skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>

        {/* Desktop Table View skeleton */}
        <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                  <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
                  <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-32" /></th>
                  <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                  <th className="px-4 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
                  <th className="px-4 py-3 text-right"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4"><Skeleton className="h-6 w-6 rounded" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-full max-w-xs" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-6 rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Grid View skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Boards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Boards you own or are a member of
          </p>
        </div>
        <Button 
          onClick={() => canCreateBoard && setCreateModalOpen(true)} 
          className="w-full sm:w-auto"
          disabled={!canCreateBoard}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create board
        </Button>
      </header>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="w-10 px-4 py-3 text-left">
                  <Star className="h-4 w-4 text-muted-foreground" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Lead
                </th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedBoards.map((board) => {
                const canUpdate = canUpdateBoard(board.id)
                const canDelete = canDeleteBoard(board.id)
                const canFavorite = canFavoriteBoard(board.id)
                return (
                  <tr
                    key={board.id}
                    onClick={() => handleBoardClick(board)}
                    className="border-b border-border/30 hover:bg-accent/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStar(board.id)
                        }}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        aria-label={board.starred ? 'Unstar board' : 'Star board'}
                        disabled={!canFavorite}
                      >
                        <Star
                          className={cn(
                            'h-4 w-4 transition-colors',
                            starredBoards.has(board.id)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground hover:text-amber-400'
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-sm">
                          {board.icon}
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {board.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {board.key}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getBoardTypeIcon(board.type)}
                        <span className="text-sm text-foreground capitalize">
                          {board.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white',
                            board.lead.color
                          )}
                        >
                          {board.lead.initials}
                        </div>
                        <span className="text-sm text-foreground">{board.lead.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {(canUpdate || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 hover:bg-accent rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="More options"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => handleEditBoard(board)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit board
                              </DropdownMenuItem>
                            )}
                            {canUpdate && canDelete && <DropdownMenuSeparator />}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteBoard(board)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete board
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
              {paginatedBoards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No boards found</p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground/70">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedBoards.map((board) => (
          <div
            key={board.id}
            onClick={() => handleBoardClick(board)}
            className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 space-y-3 cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg">
                  {board.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate">{board.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{board.key}</p>
                </div>
              </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleStar(board.id)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label={board.starred ? 'Unstar board' : 'Star board'}
                disabled={!canFavoriteBoard(board.id)}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    starredBoards.has(board.id)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
              {(canUpdateBoard(board.id) || canDeleteBoard(board.id)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdateBoard(board.id) && (
                      <DropdownMenuItem
                        onClick={() => handleEditBoard(board)}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit board
                      </DropdownMenuItem>
                    )}
                    {canUpdateBoard(board.id) && canDeleteBoard(board.id) && <DropdownMenuSeparator />}
                    {canDeleteBoard(board.id) && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteBoard(board)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                          Delete board
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                {getBoardTypeIcon(board.type)}
                <span className="text-muted-foreground text-xs capitalize">
                  {board.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium text-white',
                    board.lead.color
                  )}
                >
                  {board.lead.initials}
                </div>
                <span className="text-muted-foreground text-xs">{board.lead.name}</span>
              </div>
            </div>
          </div>
        ))}
        {paginatedBoards.length === 0 && (
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">No boards found</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground/70">
                  Try a different search term
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'h-9 w-9 p-0',
                  currentPage === page && 'pointer-events-none'
                )}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results info */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {paginatedBoards.length} of {filteredBoards.length} boards
      </div>

      {/* Create Board Modal */}
      <CreateBoardModal
        open={createModalOpen && canCreateBoard}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateBoard}
        existingKeys={boards.map((b) => (b.prefix || '').toUpperCase()).filter(Boolean)}
      />

      {/* Edit Board Modal */}
      <EditBoardModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedBoard(null)
        }}
        board={selectedBoard}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedBoard(null)
        }}
        boardName={selectedBoard?.name || ''}
        boardId={selectedBoard?.id || ''}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}
