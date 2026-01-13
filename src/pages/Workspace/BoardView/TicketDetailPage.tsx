import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '@/utils/axios.instance'
import { GET_ARCHIVED_TICKETS_BY_BOARD, GET_BOARD_BY_KEY, GET_TICKETS_BY_BOARD } from '@/utils/api.routes'
import type { Ticket } from '@/types/board'
import type { Board as ApiBoardType } from '@/types/board'
import { TaskDetailModal } from './TaskDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task, Column } from './types'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { toRichTextDoc } from '@/utils/rich-text'
import { getUserInitials } from '@/utils/formatters'

const resolveBoardRole = (board: ApiBoardType | null, userId?: string): 'owner' | 'admin' | 'member' | 'viewer' | 'none' => {
  if (!board || !userId) return 'none'
  if (board.createdBy === userId) return 'owner'
  const member = board.members?.find((m) => m.userId === userId)
  return (member?.role as 'admin' | 'member' | 'viewer') ?? 'none'
}

export function TicketDetailPage() {
  const { boardKey, ticketKey } = useParams<{ boardKey: string; ticketKey: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [boardId, setBoardId] = useState<string | undefined>()
  const [board, setBoard] = useState<ApiBoardType | null>(null)
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const hasBoardFullAccess = can(PERMISSIONS.BOARD_FULL_ACCESS)
  const boardRole = useMemo(() => resolveBoardRole(board, user?.id), [board, user?.id])
  const canEditTicket =
    hasBoardFullAccess || boardRole === 'owner' || boardRole === 'admin' || boardRole === 'member'

  useEffect(() => {
    if (!boardKey || !ticketKey) return

    const loadTicket = async () => {
      setLoading(true)
      try {
        // First, get the board to get boardId
        const boardResponse = await axiosInstance.get<{ success: boolean; data: ApiBoardType }>(
          GET_BOARD_BY_KEY(boardKey.toUpperCase())
        )

        if (!boardResponse.data.success || !boardResponse.data.data) {
          console.error('Board not found')
          navigate(`/workspace/${boardKey}`)
          return
        }

        const board = boardResponse.data.data
        setBoardId(board.id)
        setBoard(board)

        // Get columns
        const boardColumns = Array.isArray(board.columns) && board.columns.length > 0
          ? (board.columns as unknown as Array<{ id: string; name: string; order: number; hexColor?: string; isDoneColumn: boolean }>)
              .sort((a, b) => a.order - b.order)
              .map((col): Column => ({
                id: col.id,
                name: col.name,
                color: col.hexColor 
                  ? `bg-[${col.hexColor}]` 
                  : col.isDoneColumn 
                    ? 'bg-green-500' 
                    : col.order === 0 
                      ? 'bg-slate-400' 
                      : 'bg-blue-500',
                tasks: [],
              }))
          : []
        
        setColumns(boardColumns)

        // Get all tickets to find the one we need
        const ticketsResponse = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
          GET_TICKETS_BY_BOARD(board.id)
        )

        if (!ticketsResponse.data.success || !ticketsResponse.data.data) {
          console.error('Tickets not found')
          navigate(`/workspace/${boardKey}`)
          return
        }

        const tickets = ticketsResponse.data.data
        let ticket = tickets.find((t) => t.ticketKey === ticketKey.toUpperCase())

        if (!ticket) {
          try {
            const archivedResponse = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
              GET_ARCHIVED_TICKETS_BY_BOARD(board.id)
            )
            if (archivedResponse.data.success && archivedResponse.data.data) {
              ticket = archivedResponse.data.data.find((t) => t.ticketKey === ticketKey.toUpperCase())
            }
          } catch (archivedError) {
            console.error('Error loading archived tickets:', archivedError)
          }
        }

        if (!ticket) {
          console.error('Ticket not found')
          navigate(`/workspace/${boardKey}`)
          return
        }

        // Convert ticket to Task format
        const column = boardColumns.find((col) => col.id === ticket.columnId)
        const status = column?.name || 'Unknown'

        // Get user for assignee
        const assignee = ticket.assigneeId
          ? (() => {
              const member = board.memberUsers?.find((user) => user.id === ticket.assigneeId)
              const name = member?.name || 'User'
              const colors = ['bg-cyan-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-blue-500']
              const colorIndex = parseInt(ticket.assigneeId.slice(-1), 16) % colors.length
              return {
                id: ticket.assigneeId,
                name,
                initials: getUserInitials(name),
                color: colors[colorIndex],
                avatar: member?.profilePic,
              }
            })()
          : undefined

        const taskType = ticket.ticketType === 'bug' ? 'bug' :
                        ticket.ticketType === 'story' ? 'story' :
                        ticket.ticketType === 'epic' ? 'epic' :
                        ticket.ticketType === 'subtask' ? 'subtask' :
                        'task'

        const convertedTask: Task = {
          id: ticket.id,
          key: ticket.ticketKey,
          title: ticket.title,
          description: toRichTextDoc(ticket.description),
          type: taskType,
          status,
          assignee,
          priority: ticket.priority || 'medium',
          epic: ticket.rootEpicId,
          story: ticket.parentTicketId,
          labels: ticket.tags || [],
          parent: ticket.parentTicketId,
          dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
          startDate: ticket.startDate ? new Date(ticket.startDate) : undefined,
          endDate: ticket.endDate ? new Date(ticket.endDate) : undefined,
          team: undefined,
          subtasks: [],
          linkedTasks: [],
          comments: [],
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
        }

        setTask(convertedTask)
      } catch (error) {
        console.error('Error loading ticket:', error)
        navigate(`/workspace/${boardKey}`)
      } finally {
        setLoading(false)
      }
    }

    loadTicket()
  }, [boardKey, ticketKey, navigate])

  useEffect(() => {
    if (!task) return
    document.title = `${task.key} ${task.title} | KooyaHQ`
  }, [task])

  const handleClose = () => {
    navigate(`/workspace/${boardKey}`)
  }

  const handleUpdate = (updatedTask: Task) => {
    setTask(updatedTask)
  }

  const handleNavigateToTask = (taskKey: string) => {
    navigate(`/workspace/${boardKey}/${taskKey}`)
    // Reload the page to fetch new ticket
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="bg-background border-b border-border/50 w-full overflow-hidden flex flex-col flex-1">
          {/* Header skeleton */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-14 rounded-md" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full max-w-[36rem]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="ml-6 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="ml-6 space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-5/6 rounded-lg" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
                <div className="ml-6 space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-11/12 rounded-lg" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
                <div className="ml-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/20 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <div key={index} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Full page ticket view */}
      <div className="flex-1 overflow-hidden">
        <TaskDetailModal
          open={true}
          onClose={handleClose}
          task={task}
          columns={columns}
          onUpdate={handleUpdate}
          boardKey={boardKey || ''}
          boardId={boardId}
          board={board || undefined}
          onNavigateToTask={handleNavigateToTask}
          fullPage={true}
          canEdit={canEditTicket}
          canComment={canEditTicket}
        />
      </div>
    </div>
  )
}
