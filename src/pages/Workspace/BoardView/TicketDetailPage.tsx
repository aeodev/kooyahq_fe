import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '@/utils/axios.instance'
import { GET_BOARD_BY_KEY, GET_TICKETS_BY_BOARD } from '@/utils/api.routes'
import type { Ticket } from '@/types/board'
import type { Board as ApiBoardType } from '@/types/board'
import { TaskDetailModal } from './TaskDetailModal'
import type { Task, Column } from './types'

export function TicketDetailPage() {
  const { boardKey, ticketKey } = useParams<{ boardKey: string; ticketKey: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [boardId, setBoardId] = useState<string | undefined>()

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
        const ticket = tickets.find((t) => t.ticketKey === ticketKey.toUpperCase())

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
          ? {
              id: ticket.assigneeId,
              name: 'User', // Will be fetched properly if needed
              initials: 'U',
              color: 'bg-cyan-500',
            }
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
          description: typeof ticket.description === 'string' ? ticket.description : '',
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading ticket...</p>
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
          onNavigateToTask={handleNavigateToTask}
          fullPage={true}
        />
      </div>
    </div>
  )
}

