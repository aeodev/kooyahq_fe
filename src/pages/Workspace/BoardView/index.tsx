import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '@/utils/axios.instance'
import { GET_ARCHIVED_TICKETS_BY_BOARD, GET_BOARD_BY_KEY, GET_TICKETS_BY_BOARD, GET_USERS } from '@/utils/api.routes'
import type { Board as ApiBoardType, Ticket, GithubStatus, GithubAutomationRule } from '@/types/board'
import type { Board as BoardViewBoard, Column as BoardViewColumn } from './types'
import { toRichTextDoc } from '@/utils/rich-text'
import { useSocketStore } from '@/stores/socket.store'
import { BoardSocketEvents } from '@/hooks/socket/board.socket'
import { TicketSocketEvents } from '@/hooks/socket/ticket.socket'
import { useUpdateTicket, useMoveTicket, useDeleteTicket, useUpdateBoard } from '@/hooks/board.hooks'
import { BULK_UPDATE_RANKS } from '@/utils/api.routes'
import { toast } from 'sonner'

// Type guard to ensure we're using the correct type
function isApiBoardType(board: any): board is ApiBoardType {
  return (
    board && 
    typeof board === 'object' && 
    'id' in board &&
    'name' in board &&
    'prefix' in board && 
    'type' in board &&
    'columns' in board
  )
}

const GLOBAL_WORKSPACE_ID = 'global' as const
import {
  Search,
  ChevronDown,
  Settings2,
  User,
  CheckSquare,
  ChevronRight,
  Plus,
  Bug,
  Bookmark,
  Zap,
  SquareCheck,
  Link2,
  Maximize2,
  Minimize2,
  Check,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Archive,
  BarChart3,
  MoreVertical,
  GitBranch,
  GitPullRequest,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ConfigureBoardModal } from './ConfigureBoardModal'
import { TaskDetailModal } from './TaskDetailModal'
import { CreateTaskModal } from './CreateTaskModal'
import { FilterDropdown } from './FilterDropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import type {
  TaskType,
  GroupBy,
  Priority,
  Assignee,
  Task,
  Column,
  Board,
} from './types'

// Re-export types for other components
export type { TaskType, GroupBy, Priority, Assignee, Comment, Subtask, Task, Column, Board } from './types'

// Mock data
export const MOCK_ASSIGNEES: Assignee[] = [
  { id: '1', name: 'Stephen Layson', initials: 'SL', color: 'bg-cyan-500' },
  { id: '2', name: 'Kyle Cayanan', initials: 'KC', color: 'bg-amber-500' },
  { id: '3', name: 'Hector Lopez', initials: 'HL', color: 'bg-purple-500' },
]

const createMockTask = (
  id: string,
  key: string,
  title: string,
  type: TaskType,
  status: string,
  priority: Priority,
  assignee?: Assignee,
  labels: string[] = []
): Task => ({
  id,
  key,
  title,
  description: '',
  type,
  status,
  assignee,
  priority,
  labels,
  subtasks: [],
  linkedTasks: [],
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const MOCK_BOARDS: Record<string, Board> = {
  tq: {
    id: '7',
    name: 'Traderise QA Website',
    key: 'TQ',
    icon: '🌐',
    nextTaskNumber: 15,
    columns: [
      {
        id: 'todo',
        name: 'TO DO',
        color: 'bg-slate-400',
        tasks: [
          createMockTask('1', 'TQ-9', '[BUG-007] Unable to Change Fibonacci Colors or Values Inside Reanalyze', 'bug', 'todo', 'high', MOCK_ASSIGNEES[0], ['bug']),
          createMockTask('2', 'TQ-10', '[BUG-008] Two Tools Can Be Selected Simultaneously When Switching Quickly', 'bug', 'todo', 'medium', MOCK_ASSIGNEES[0], ['bug']),
          createMockTask('3', 'TQ-11', '[BUG-010] Fibonacci Tool Stretch Points Incorrectly Set to 0 and 1', 'bug', 'todo', 'high', MOCK_ASSIGNEES[0], ['bug']),
          createMockTask('4', 'TQ-12', '[BUG-012] Room Refreshes for All Users After Inviting Someone', 'bug', 'todo', 'medium', MOCK_ASSIGNEES[0], ['bug']),
        ],
      },
      {
        id: 'inprogress',
        name: 'IN PROGRESS',
        color: 'bg-blue-500',
        tasks: [
          {
            ...createMockTask('7', 'TQ-5', 'Workspace Backend', 'task', 'inprogress', 'high', MOCK_ASSIGNEES[0], ['WORKSPACE PAGE']),
            subtasks: [
              { id: 's1', key: 'TQ-341', title: 'Implement API endpoint for displaying Workspace', priority: 'highest', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 's2', key: 'TQ-344', title: 'Implement API endpoint to reject a contact', priority: 'highest', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 's3', key: 'TQ-342', title: 'Implement API endpoint to shortlist a contact', priority: 'high', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 's4', key: 'TQ-343', title: 'Implement API endpoint for candidate matching', priority: 'high', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
            ],
          },
          createMockTask('8', 'TQ-7', '[BUG-006] Unexpected Drag Handle (Circle) Appears When Dragging Line on Mobile', 'bug', 'inprogress', 'medium', MOCK_ASSIGNEES[2], ['bug']),
        ],
      },
      {
        id: 'qa-dev',
        name: 'FOR QA TO CHECK - DEV',
        color: 'bg-orange-500',
        tasks: [],
      },
      {
        id: 'qa-stage',
        name: 'FOR QA TO CHECK - STAGE',
        color: 'bg-yellow-500',
        tasks: [],
      },
      {
        id: 'qa-passed',
        name: 'QA PASSED',
        color: 'bg-green-500',
        tasks: [],
      },
      {
        id: 'qa-failed',
        name: 'QA FAILED',
        color: 'bg-red-500',
        tasks: [],
      },
    ],
  },
  tt: {
    id: '6',
    name: 'TalentTap Issues Tracker',
    key: 'TT',
    icon: '🎪',
    nextTaskNumber: 350,
    columns: [
      {
        id: 'todo',
        name: 'TO DO',
        color: 'bg-slate-400',
        tasks: [
          {
            ...createMockTask('t1', 'TT-246', 'ISSUE_30 - Designing a user permissions framework for modular components.', 'task', 'todo', 'medium', MOCK_ASSIGNEES[0]),
            description: '<p>Design and implement a comprehensive user permissions framework that allows for modular component access control.</p>',
            subtasks: [
              { id: 'ts1', key: 'TT-341', title: 'Implement API endpoint for displaying Workspace', priority: 'highest', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 'ts2', key: 'TT-344', title: 'Implement API endpoint to reject a contact', priority: 'highest', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 'ts3', key: 'TT-342', title: 'Implement API endpoint to shortlist a contact', priority: 'high', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
              { id: 'ts4', key: 'TT-343', title: 'Implement API endpoint for candidate matching', priority: 'high', assignee: MOCK_ASSIGNEES[0], status: 'inprogress' },
            ],
          },
          createMockTask('t2', 'TT-259', 'ISSUE_204 - candidate searching is not working ( type qa)', 'task', 'todo', 'high', MOCK_ASSIGNEES[0]),
          createMockTask('t3', 'TT-260', 'ISSUE_220 - tt phone search is not working (try to find 54-547-7378)', 'task', 'todo', 'high', MOCK_ASSIGNEES[0]),
          createMockTask('t4', 'TT-325', 'CV Parsing Issue: Same Phone Number & Email Assigned Across Different Candidates With Different Onboard Dates (18/09/2025 vs 19/11/2025)', 'task', 'todo', 'medium', MOCK_ASSIGNEES[0]),
        ],
      },
      {
        id: 'inprogress',
        name: 'IN PROGRESS',
        color: 'bg-blue-500',
        tasks: [
          createMockTask('t5', 'TT-282', 'Backend API optimization', 'task', 'inprogress', 'high', MOCK_ASSIGNEES[0]),
          {
            ...createMockTask('t6', 'TT-340', 'Workspace Backend', 'task', 'inprogress', 'high', MOCK_ASSIGNEES[0], ['WORKSPACE PAGE']),
            subtasks: [],
          },
        ],
      },
      {
        id: 'qa-dev',
        name: 'FOR QA TO CHECK - DEV',
        color: 'bg-orange-500',
        tasks: [],
      },
      {
        id: 'qa-stage',
        name: 'FOR QA TO CHECK - STAGE',
        color: 'bg-yellow-500',
        tasks: [],
      },
      {
        id: 'qa-passed',
        name: 'QA PASSED',
        color: 'bg-green-500',
        tasks: [],
      },
      {
        id: 'qa-failed',
        name: 'QA FAILED',
        color: 'bg-red-500',
        tasks: [],
      },
    ],
  },
}

// Helper functions
export function getTaskTypeIcon(type: TaskType, className?: string) {
  const baseClass = 'h-4 w-4 flex-shrink-0'
  switch (type) {
    case 'bug':
      return <Bug className={cn(baseClass, 'text-red-500', className)} />
    case 'task':
      return <SquareCheck className={cn(baseClass, 'text-blue-500', className)} />
    case 'subtask':
      return <SquareCheck className={cn(baseClass, 'text-cyan-500 scale-90', className)} />
    case 'epic':
      return <Zap className={cn(baseClass, 'text-purple-500', className)} />
    case 'story':
      return <Bookmark className={cn(baseClass, 'text-green-500', className)} />
    default:
      return <SquareCheck className={cn(baseClass, 'text-muted-foreground', className)} />
  }
}

export function getPriorityIcon(priority: Priority) {
  const colors = {
    highest: 'text-red-600',
    high: 'text-red-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
    lowest: 'text-blue-400',
  }
  
  if (priority === 'highest') {
    return (
      <div className="flex">
        <ChevronRight className={cn('h-3.5 w-3.5 -mr-2 rotate-[-90deg]', colors[priority])} />
        <ChevronRight className={cn('h-3.5 w-3.5 rotate-[-90deg]', colors[priority])} />
      </div>
    )
  }
  
  return (
    <ChevronRight
      className={cn(
        'h-3.5 w-3.5',
        colors[priority],
        priority === 'high' && 'rotate-[-90deg]',
        priority === 'medium' && 'rotate-0',
        priority === 'low' && 'rotate-[90deg]',
        priority === 'lowest' && 'rotate-[90deg]'
      )}
    />
  )
}

export function getPriorityLabel(priority: Priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

const formatDuration = (durationMs: number | null) => {
  if (!durationMs || !Number.isFinite(durationMs)) {
    return 'N/A'
  }
  const minutes = durationMs / (1000 * 60)
  const hours = durationMs / (1000 * 60 * 60)
  const days = durationMs / (1000 * 60 * 60 * 24)
  if (days >= 1) return `${days.toFixed(1)} days`
  if (hours >= 1) return `${hours.toFixed(1)} hrs`
  return `${Math.max(1, Math.round(minutes))} mins`
}

// Helper function to extract hex color from Tailwind class or return the color as-is
const getHexColor = (colorClass: string): string | undefined => {
  if (colorClass.startsWith('#')) {
    return colorClass
  }
  if (colorClass.startsWith('bg-[')) {
    const match = colorClass.match(/bg-\[([^\]]+)\]/)
    return match?.[1] || undefined
  }
  // Map common Tailwind colors to hex (fallback for standard classes)
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

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'type', label: 'Type' },
  { value: 'subtask', label: 'Subtask' },
  { value: 'epic', label: 'Epic' },
  { value: 'story', label: 'Story' },
  { value: 'priority', label: 'Priority' },
]

type DevTone = 'info' | 'warning' | 'error' | 'success' | 'neutral'

const DEV_TONE_CLASSES: Record<DevTone, string> = {
  info: 'border-sky-500/40 text-sky-600 bg-sky-500/10',
  warning: 'border-amber-500/40 text-amber-600 bg-amber-500/10',
  error: 'border-rose-500/40 text-rose-600 bg-rose-500/10',
  success: 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10',
  neutral: 'border-slate-500/40 text-slate-600 bg-slate-500/10',
}

const DEV_STATUS_OPTIONS: Array<{ value: GithubStatus; label: string; tone: DevTone }> = [
  { value: 'pull-requested', label: 'Pull requested', tone: 'info' },
  { value: 'pull-request-build-check-passed', label: 'PR build check passed', tone: 'success' },
  { value: 'pull-request-build-check-failed', label: 'PR build check failed', tone: 'error' },
  { value: 'deploying', label: 'Deploying', tone: 'warning' },
  { value: 'deployment-failed', label: 'Deployment failed', tone: 'error' },
  { value: 'deployed', label: 'Deployed', tone: 'success' },
]

const createRuleId = () => `rule_${Math.random().toString(36).slice(2, 10)}`

const resolveBoardRole = (board: ApiBoardType | null | undefined, userId?: string): 'owner' | 'admin' | 'member' | 'viewer' | 'none' => {
  if (!board || !userId) return 'none'
  if (board.createdBy === userId) return 'owner'
  const member = board.members?.find((m) => m.userId === userId)
  return (member?.role as 'admin' | 'member' | 'viewer') ?? 'none'
}

export function BoardView() {
  const { boardKey } = useParams<{ boardKey: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const can = useAuthStore((state) => state.can)
  const currentUser = useAuthStore((state) => state.user)
  const hasBoardFullAccess = can(PERMISSIONS.BOARD_FULL_ACCESS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [configureModalOpen, setConfigureModalOpen] = useState(false)
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false)
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [draggedTask, setDraggedTask] = useState<{ task: Task; columnId: string; taskIndex: number } | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null)
  const boardContainerRef = useRef<HTMLDivElement>(null)
  // Track recent moves to prevent socket event interference
  const recentMovesRef = useRef<Map<string, number>>(new Map())
  // Track tickets with pending optimistic updates to prevent useEffect from overwriting them
  const optimisticUpdatesRef = useRef<Set<string>>(new Set())
  
  // Header state
  type ViewTab = 'summary' | 'board' | 'list' | 'timeline' | 'development' | 'archived'
  
  const [activeTab, setActiveTab] = useState<ViewTab>('board')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  
  // Save view preference to localStorage when it changes
  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab)
    if (boardKey) {
      localStorage.setItem(`board-view-${boardKey}`, tab)
    }
  }
  
  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<{
    type: TaskType[]
    assignee: string[]
    labels: string[]
    status: string[]
    priority: Priority[]
  }>({
    type: [],
    assignee: [],
    labels: [],
    status: [],
    priority: [],
  })
  
  // Sync assignee filter between modal and outside filter
  // When assignee changes in modal, update outside filter
  useEffect(() => {
    if (selectedFilters.assignee.length !== selectedUsers.length ||
        selectedFilters.assignee.some((id, i) => id !== selectedUsers[i])) {
      setSelectedUsers(selectedFilters.assignee)
    }
  }, [selectedFilters.assignee])
  
  // When assignee changes outside, update modal filter
  useEffect(() => {
    if (selectedUsers.length !== selectedFilters.assignee.length ||
        selectedUsers.some((id, i) => id !== selectedFilters.assignee[i])) {
      setSelectedFilters((prev) => ({
        ...prev,
        assignee: selectedUsers,
      }))
    }
  }, [selectedUsers])
  
  // Fetch board from API
  const [apiBoard, setApiBoard] = useState<ApiBoardType | null>(null)
  const boardRole = useMemo(
    () => resolveBoardRole(apiBoard, currentUser?.id),
    [apiBoard, currentUser?.id]
  )
  const canBoardUpdate = hasBoardFullAccess || boardRole === 'owner' || boardRole === 'admin'
  const canTicketCreate =
    hasBoardFullAccess || boardRole === 'owner' || boardRole === 'admin' || boardRole === 'member'
  const canTicketRank = canTicketCreate
  const showBoardControls = activeTab !== 'summary' && activeTab !== 'timeline' && activeTab !== 'development'
  const [isLoading, setIsLoading] = useState(true)
  const [boardError, setBoardError] = useState<{ statusCode?: number; message: string } | null>(null)
  const [apiTickets, setApiTickets] = useState<Ticket[]>([])
  const [archivedTickets, setArchivedTickets] = useState<Ticket[]>([])
  const [archivedTicketsLoaded, setArchivedTicketsLoaded] = useState(false)
  const [archivedTicketsLoading, setArchivedTicketsLoading] = useState(false)
  const [apiUsers, setApiUsers] = useState<Array<{ id: string; name: string; email?: string; profilePic?: string }>>([])
  const { updateTicket: updateTicketAPI } = useUpdateTicket()
  const { moveTicket: moveTicketAPI } = useMoveTicket()
  const { deleteTicket: deleteTicketAPI } = useDeleteTicket()
  const { updateBoard: updateBoardAPI, loading: updateBoardLoading } = useUpdateBoard()
  const [githubRules, setGithubRules] = useState<GithubAutomationRule[]>([])
  const [rulesDirty, setRulesDirty] = useState(false)
  
  // Set initial view based on board's defaultView setting when board loads
  useEffect(() => {
    if (apiBoard && isApiBoardType(apiBoard) && boardKey) {
      const typedBoard = apiBoard as ApiBoardType & { settings?: { defaultView?: 'board' | 'list' | 'timeline' } }
      // Check if there's a saved preference first
      const savedView = localStorage.getItem(`board-view-${boardKey}`)
      
      if (!savedView && typedBoard.settings?.defaultView) {
        // No saved preference, use board's default
        const boardDefaultView = typedBoard.settings.defaultView
        if (['board', 'list', 'timeline'].includes(boardDefaultView)) {
          setActiveTab(boardDefaultView as ViewTab)
          localStorage.setItem(`board-view-${boardKey}`, boardDefaultView)
        }
      } else if (savedView && ['summary', 'board', 'list', 'timeline', 'development', 'archived'].includes(savedView)) {
        // Use saved preference
        setActiveTab(savedView as ViewTab)
      } else if (typedBoard.settings?.defaultView && ['board', 'list', 'timeline'].includes(typedBoard.settings.defaultView)) {
        // Fallback to board default
        setActiveTab(typedBoard.settings.defaultView as ViewTab)
      }
    }
  }, [apiBoard?.id, boardKey]) // Depend on board ID and boardKey

  useEffect(() => {
    setArchivedTickets([])
    setArchivedTicketsLoaded(false)
    setArchivedTicketsLoading(false)
  }, [apiBoard?.id])

  useEffect(() => {
    if (!apiBoard || !isApiBoardType(apiBoard)) return
    if (rulesDirty) return
    setGithubRules(apiBoard.settings?.githubAutomation?.rules ?? [])
  }, [apiBoard, rulesDirty])

  // Fetch board by key when component mounts or key changes
  useEffect(() => {
    if (!boardKey) {
      setIsLoading(false)
      return
    }

    const loadBoard = async () => {
      setIsLoading(true)
      setBoardError(null)
      try {
        const response = await axiosInstance.get<{ success: boolean; data: ApiBoardType }>(
          GET_BOARD_BY_KEY(boardKey.toUpperCase())
        )
        console.log('Board API response:', response.data)
        const boardData = response.data.data
        // Verify the board has required fields
        if (!boardData || !('prefix' in boardData)) {
          console.error('Board data missing required fields:', boardData)
          setBoardError({ 
            statusCode: 500, 
            message: 'Invalid board data received from server' 
          })
          setApiBoard(null)
        } else {
          setApiBoard(boardData as ApiBoardType)
          
          // Fetch tickets for this board
          try {
            const ticketsResponse = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
              GET_TICKETS_BY_BOARD(boardData.id)
            )
            if (ticketsResponse.data.success && ticketsResponse.data.data) {
              setApiTickets(ticketsResponse.data.data)
            }
          } catch (ticketError: any) {
            console.error('Error loading tickets:', ticketError)
            // Don't fail the whole board load if tickets fail
            setApiTickets([])
          }
          
          // Fetch users for assignee mapping
          try {
            const usersResponse = await axiosInstance.get<{ status: string; data: Array<{ id: string; name: string; email?: string; profilePic?: string }> }>(
              GET_USERS()
            )
            if (usersResponse.data.data) {
              setApiUsers(usersResponse.data.data)
            }
          } catch (userError: any) {
            console.error('Error loading users:', userError)
            // Don't fail if users fail - use mock assignees as fallback
          }
        }
      } catch (error: any) {
        console.error('Error loading board:', error)
        const statusCode = error?.response?.status
        const message = error?.response?.data?.message || error?.message || 'Failed to load board'
        setBoardError({ statusCode, message })
        setApiBoard(null)
        setApiTickets([])
      } finally {
        setIsLoading(false)
      }
    }

    loadBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey])

  useEffect(() => {
    if (!apiBoard?.id || activeTab !== 'archived' || archivedTicketsLoaded || archivedTicketsLoading) {
      return
    }

    const loadArchivedTickets = async () => {
      setArchivedTicketsLoading(true)
      try {
        const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
          GET_ARCHIVED_TICKETS_BY_BOARD(apiBoard.id)
        )
        if (response.data.success && response.data.data) {
          setArchivedTickets(response.data.data)
        } else {
          setArchivedTickets([])
        }
      } catch (error) {
        console.error('Error loading archived tickets:', error)
        setArchivedTickets([])
      } finally {
        setArchivedTicketsLoaded(true)
        setArchivedTicketsLoading(false)
      }
    }

    loadArchivedTickets()
  }, [apiBoard?.id, activeTab, archivedTicketsLoaded, archivedTicketsLoading])

  // Socket connection for real-time updates
  const socket = useSocketStore((state) => state.socket)
  const connected = useSocketStore((state) => state.connected)

  // Listen for board socket events
  useEffect(() => {
    if (!socket || !connected || !apiBoard?.id) return

    const boardId = apiBoard.id

    const handleBoardUpdated = (data: { board: ApiBoardType; userId: string; timestamp: string }) => {
      // Only update if it's the current board
      if (data.board.id === boardId) {
        setApiBoard(data.board)
        // Update columns if they changed
        if (data.board.columns && Array.isArray(data.board.columns) && data.board.columns.length > 0) {
          // Check if first element is an object (not a string)
          const firstCol = data.board.columns[0]
          if (typeof firstCol === 'object' && firstCol !== null && 'id' in firstCol && 'name' in firstCol) {
            const updatedColumns = (data.board.columns as unknown as Array<{ id: string; name: string; order: number; hexColor?: string; isDoneColumn: boolean }>)
              .sort((a, b) => a.order - b.order)
              .map((col): BoardViewColumn => ({
                id: col.id,
                name: col.name,
                color: col.hexColor 
                  ? `bg-[${col.hexColor}]` 
                  : col.isDoneColumn 
                    ? 'bg-green-500' 
                    : col.order === 0 
                      ? 'bg-slate-400' 
                      : 'bg-blue-500',
                tasks: [], // Tasks are managed separately
              }))
            setColumns(updatedColumns)
          }
        }
      }
    }

    socket.on(BoardSocketEvents.UPDATED, handleBoardUpdated)

    return () => {
      socket.off(BoardSocketEvents.UPDATED, handleBoardUpdated)
    }
  }, [socket, connected, apiBoard?.id]) // Only depend on board ID, not entire object

  // Join global board room to receive socket events
  useEffect(() => {
    if (socket && connected) {
      socket.emit('workspace:join', GLOBAL_WORKSPACE_ID)
      return () => {
        socket.emit('workspace:leave', GLOBAL_WORKSPACE_ID)
      }
    }
  }, [socket, connected])

  // Listen for ticket socket events
  useEffect(() => {
    if (!socket || !connected || !apiBoard?.id || !currentUser?.id) return

    const boardId = apiBoard.id

    const handleTicketCreated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
      // Only process if ticket belongs to current board and not from current user
      if (data.ticket.boardId === boardId && data.userId !== currentUser.id) {
        if (data.ticket.archivedAt) {
          setArchivedTickets((prev) => {
            if (prev.some((t) => t.id === data.ticket.id)) {
              return prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
            }
            return [...prev, data.ticket]
          })
          return
        }
        setApiTickets((prev) => {
          // Check if ticket already exists (avoid duplicates)
          if (prev.some((t) => t.id === data.ticket.id)) {
            return prev
          }
          return [...prev, data.ticket]
        })
      }
    }

    const handleTicketUpdated = (data: { ticket: Ticket; userId: string; timestamp: string }) => {
      // Only process if ticket belongs to current board and not from current user
      if (data.ticket.boardId === boardId && data.userId !== currentUser.id) {
        // Skip if this ticket has a pending optimistic update
        if (optimisticUpdatesRef.current.has(data.ticket.id)) {
          return
        }

        if (data.ticket.archivedAt) {
          setApiTickets((prev) => prev.filter((t) => t.id !== data.ticket.id))
          setArchivedTickets((prev) => {
            if (prev.some((t) => t.id === data.ticket.id)) {
              return prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
            }
            return [...prev, data.ticket]
          })
        } else {
          setArchivedTickets((prev) => prev.filter((t) => t.id !== data.ticket.id))
          setApiTickets((prev) => {
            if (prev.some((t) => t.id === data.ticket.id)) {
              return prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
            }
            return [...prev, data.ticket]
          })
        }
      }
    }

    const handleTicketDeleted = (data: { ticketId: string; boardId: string; userId: string; timestamp: string }) => {
      // Only process if ticket belongs to current board and not from current user
      if (data.boardId === boardId && data.userId !== currentUser.id) {
        setApiTickets((prev) => prev.filter((t) => t.id !== data.ticketId))
        setArchivedTickets((prev) => prev.filter((t) => t.id !== data.ticketId))
      }
    }

    socket.on(TicketSocketEvents.CREATED, handleTicketCreated)
    socket.on(TicketSocketEvents.UPDATED, handleTicketUpdated)
    socket.on(TicketSocketEvents.DELETED, handleTicketDeleted)

    return () => {
      socket.off(TicketSocketEvents.CREATED, handleTicketCreated)
      socket.off(TicketSocketEvents.UPDATED, handleTicketUpdated)
      socket.off(TicketSocketEvents.DELETED, handleTicketDeleted)
    }
  }, [socket, connected, apiBoard?.id, currentUser?.id])

  // Get board data - prefer API board, fallback to mock
  const board: BoardViewBoard | null = apiBoard && isApiBoardType(apiBoard)
    ? (() => {
        // Access properties directly from apiBoard since type guard confirms it has them
        const typedApiBoard = apiBoard as ApiBoardType & { prefix?: string; emoji?: string }
        return {
          id: typedApiBoard.id,
          name: typedApiBoard.name,
          key: typedApiBoard.prefix || typedApiBoard.name.substring(0, 10).toUpperCase().replace(/\s+/g, ''),
          icon: typedApiBoard.emoji || '📋',
          nextTaskNumber: 1, // Will need to fetch from cards
          columns: Array.isArray(typedApiBoard.columns) && typedApiBoard.columns.length > 0 && typeof typedApiBoard.columns[0] === 'object'
            ? ((typedApiBoard.columns as unknown) as Array<{ id: string; name: string; order: number; hexColor?: string; isDoneColumn: boolean }>)
                .sort((a, b) => a.order - b.order)
                .map((col): BoardViewColumn => ({
                  id: col.id,
                  name: col.name,
                  color: col.hexColor 
                    ? `bg-[${col.hexColor}]` 
                    : col.isDoneColumn 
                      ? 'bg-green-500' 
                      : col.order === 0 
                        ? 'bg-slate-400' 
                        : 'bg-blue-500',
                  tasks: [], // Will need to fetch from cards and transform
                }))
            : [],
        }
      })()
    : boardKey
    ? MOCK_BOARDS[boardKey.toLowerCase()]
    : null

  // Initialize columns from board data (only once when board first loads)
  useEffect(() => {
    if (apiBoard && isApiBoardType(apiBoard) && apiBoard.columns) {
      // Only update if columns haven't been set yet or if board ID changed
      const boardColumns = Array.isArray(apiBoard.columns) && apiBoard.columns.length > 0
        ? (apiBoard.columns as unknown as Array<{ id: string; name: string; order: number; hexColor?: string; isDoneColumn: boolean }>)
            .sort((a, b) => a.order - b.order)
            .map((col): BoardViewColumn => ({
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
      
      if (boardColumns.length > 0 && (columns.length === 0 || columns[0]?.id !== boardColumns[0]?.id)) {
        setColumns(boardColumns)
      }
    }
  }, [apiBoard?.id]) // Only depend on board ID, not the entire board object

  // Handle URL-based task selection
  useEffect(() => {
    const taskKey = searchParams.get('selectedTask')
    if (taskKey && columns.length > 0) {
      for (const column of columns) {
        const task = column.tasks.find((t) => t.key === taskKey)
        if (task) {
          setSelectedTask(task)
          break
        }
      }
    } else if (!taskKey) {
      setSelectedTask(null)
    }
  }, [searchParams, columns])

  // Helper to get user initials
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Convert API users to Assignee format
  const assigneesFromApi = useMemo(() => {
    return apiUsers.map((user): Assignee => {
      const initials = getUserInitials(user.name)
      // Generate a color based on user ID for consistency
      const colors = ['bg-cyan-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-blue-500']
      const colorIndex = parseInt(user.id.slice(-1), 16) % colors.length
      return {
        id: user.id,
        name: user.name,
        initials,
        color: colors[colorIndex],
        avatar: user.profilePic,
      }
    })
  }, [apiUsers])

  const columnNameById = useMemo(() => {
    return columns.reduce<Record<string, string>>((acc, column) => {
      acc[column.id] = column.name
      return acc
    }, {})
  }, [columns])

  const buildTaskFromTicket = useCallback(
    (ticket: Ticket, status: string): Task => {
      let assignee: Assignee | undefined = undefined
      if (ticket.assigneeId) {
        assignee =
          assigneesFromApi.find((a) => a.id === ticket.assigneeId) ||
          MOCK_ASSIGNEES.find((a) => a.id === ticket.assigneeId)
      }

      const taskType: TaskType =
        ticket.ticketType === 'bug'
          ? 'bug'
          : ticket.ticketType === 'story'
            ? 'story'
            : ticket.ticketType === 'epic'
              ? 'epic'
              : ticket.ticketType === 'subtask'
                ? 'subtask'
                : 'task'

      const priority: Priority = ticket.priority || 'medium'

      const boardPrefix = apiBoard && isApiBoardType(apiBoard)
        ? (apiBoard as ApiBoardType & { prefix?: string }).prefix
        : undefined

      return {
        id: ticket.id,
        key: ticket.ticketKey || `${boardPrefix || 'T'}-${ticket.id.substring(0, 3)}`,
        title: ticket.title,
        description: toRichTextDoc(ticket.description),
        type: taskType,
        status: status || 'Unknown',
        assignee,
        priority,
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
    },
    [apiBoard, assigneesFromApi]
  )

  // Convert API tickets to Task format for filters
  const allTasksFromTickets = useMemo(() => {
    if (apiTickets.length === 0) return []
    return apiTickets.map((ticket) =>
      buildTaskFromTicket(ticket, columnNameById[ticket.columnId] || 'Unknown')
    )
  }, [apiTickets, buildTaskFromTicket, columnNameById])

  // Get all tasks from columns for filter modal (fallback to mock if no tickets)
  const allTasks = useMemo(() => {
    // Prefer API tickets if available, otherwise use mock tasks from columns
    if (allTasksFromTickets.length > 0) {
      return allTasksFromTickets
    }
    return columns.flatMap((column) => column.tasks)
  }, [allTasksFromTickets, columns])

  const archivedTasksFromTickets = useMemo(() => {
    if (archivedTickets.length === 0) return []
    return archivedTickets.map((ticket) =>
      buildTaskFromTicket(ticket, columnNameById[ticket.columnId] || 'Unknown')
    )
  }, [archivedTickets, buildTaskFromTicket, columnNameById])

  // Distribute tickets to columns based on columnId
  useEffect(() => {
    // Skip redistribution if there are pending optimistic updates to prevent overwriting them
    // This prevents the "jump back" effect when multiple moves happen simultaneously
    if (optimisticUpdatesRef.current.size > 0) {
      return
    }
    
    if (apiTickets.length > 0 && columns.length > 0) {
      setColumns((prevColumns) => {
        return prevColumns.map((column) => {
          // Find tickets that belong to this column
          const columnTickets = apiTickets.filter((ticket) => ticket.columnId === column.id)
          
          // Convert tickets to tasks for this column
          const columnTasks = columnTickets.map((ticket) => buildTaskFromTicket(ticket, column.name))
          
          return {
            ...column,
            tasks: columnTasks,
          }
        })
      })
    } else if (apiTickets.length === 0 && columns.length > 0) {
      // Clear tasks if no tickets
      setColumns((prevColumns) => 
        prevColumns.map((col) => ({ ...col, tasks: [] }))
      )
    }
  }, [apiTickets, columns.length, buildTaskFromTicket])

  const passesTaskFilters = useCallback(
    (task: Task) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (
          !task.title.toLowerCase().includes(query) &&
          !task.key.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      const assigneeFilter = selectedFilters.assignee.length > 0 ? selectedFilters.assignee : selectedUsers
      if (assigneeFilter.length > 0) {
        if (!task.assignee || !assigneeFilter.includes(task.assignee.id)) {
          return false
        }
      }

      if (selectedFilters.type.length > 0) {
        if (!selectedFilters.type.includes(task.type)) {
          return false
        }
      }

      if (selectedFilters.labels.length > 0) {
        const hasMatchingLabel = selectedFilters.labels.some((label) =>
          task.labels.includes(label)
        )
        if (!hasMatchingLabel) {
          return false
        }
      }

      if (selectedFilters.status.length > 0) {
        if (!selectedFilters.status.includes(task.status)) {
          return false
        }
      }

      if (selectedFilters.priority.length > 0) {
        if (!selectedFilters.priority.includes(task.priority)) {
          return false
        }
      }

      return true
    },
    [searchQuery, selectedUsers, selectedFilters]
  )

  // Filter tasks based on search, user selection, and filter modal selections
  const filteredColumns = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter(passesTaskFilters),
    }))
  }, [columns, passesTaskFilters])

  const filteredArchivedTasks = useMemo(() => {
    return archivedTasksFromTickets.filter(passesTaskFilters)
  }, [archivedTasksFromTickets, passesTaskFilters])

  const doneColumnIds = useMemo(() => {
    if (!apiBoard || !isApiBoardType(apiBoard) || !Array.isArray(apiBoard.columns)) {
      return new Set<string>()
    }
    const ids = (apiBoard.columns as Array<{ id?: string; isDoneColumn?: boolean }>).flatMap((col) => {
      if (!col || typeof col !== 'object') return []
      if (!('id' in col) || !col.isDoneColumn) return []
      return typeof col.id === 'string' ? [col.id] : []
    })
    return new Set(ids)
  }, [apiBoard])

  const summaryStats = useMemo(() => {
    const now = Date.now()
    const total = apiTickets.length
    const doneTickets = apiTickets.filter((ticket) => doneColumnIds.has(ticket.columnId))
    const doneCount = doneTickets.length
    const openTickets = apiTickets.filter((ticket) => !doneColumnIds.has(ticket.columnId))
    const openCount = openTickets.length

    const overdueCount = openTickets.filter((ticket) => {
      if (!ticket.dueDate) return false
      const due = new Date(ticket.dueDate).getTime()
      return Number.isFinite(due) && due < now
    }).length

    const upcomingCount = openTickets.filter((ticket) => {
      if (!ticket.dueDate) return false
      const due = new Date(ticket.dueDate).getTime()
      return Number.isFinite(due) && due >= now && due <= now + 7 * 24 * 60 * 60 * 1000
    }).length

    const completionDurations = doneTickets
      .map((ticket) => {
        if (!ticket.completedAt) return null
        const created = new Date(ticket.createdAt).getTime()
        const completed = new Date(ticket.completedAt).getTime()
        if (!Number.isFinite(created) || !Number.isFinite(completed) || completed < created) {
          return null
        }
        return completed - created
      })
      .filter((duration): duration is number => duration !== null)

    const openDurations = openTickets
      .map((ticket) => {
        const created = new Date(ticket.createdAt).getTime()
        if (!Number.isFinite(created)) return null
        return now - created
      })
      .filter((duration): duration is number => duration !== null)

    const avgCompletionMs = completionDurations.length
      ? completionDurations.reduce((sum, value) => sum + value, 0) / completionDurations.length
      : null

    const avgOpenMs = openDurations.length
      ? openDurations.reduce((sum, value) => sum + value, 0) / openDurations.length
      : null

    return {
      total,
      doneCount,
      openCount,
      overdueCount,
      upcomingCount,
      avgCompletionMs,
      avgOpenMs,
    }
  }, [apiTickets, doneColumnIds])

  const columnBreakdown = useMemo(() => {
    return columns.map((column) => ({
      id: column.id,
      name: column.name,
      color: column.color,
      count: column.tasks.length,
      tasks: column.tasks,
    }))
  }, [columns])

  const columnPieData = useMemo(() => {
    return columnBreakdown
      .filter((column) => column.count > 0)
      .map((column) => ({
        name: column.name,
        value: column.count,
        color: getHexColor(column.color) || '#94a3b8',
      }))
  }, [columnBreakdown])

  const doneVsNotData = useMemo(() => {
    return [
      {
        name: 'Tickets',
        done: summaryStats.doneCount,
        notDone: summaryStats.openCount,
      },
    ]
  }, [summaryStats.doneCount, summaryStats.openCount])

  const priorityStats = useMemo(() => {
    const priorities: Priority[] = ['highest', 'high', 'medium', 'low', 'lowest']
    return priorities.map((priority) => ({
      priority,
      count: apiTickets.filter((ticket) => ticket.priority === priority).length,
    }))
  }, [apiTickets])

  const maxPriorityCount = useMemo(() => {
    return Math.max(1, ...priorityStats.map((stat) => stat.count))
  }, [priorityStats])

  const userTicketRanking = useMemo(() => {
    if (!currentUser?.id) return []
    const tickets = apiTickets.filter(
      (ticket) => ticket.assigneeId === currentUser.id || ticket.reporterId === currentUser.id
    )
    return tickets
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((ticket) =>
        buildTaskFromTicket(ticket, columnNameById[ticket.columnId] || 'Unknown')
      )
  }, [apiTickets, buildTaskFromTicket, columnNameById, currentUser?.id])

  const upcomingTickets = useMemo(() => {
    const now = Date.now()
    const cutoff = now + 7 * 24 * 60 * 60 * 1000
    return apiTickets
      .filter((ticket) => {
        if (!ticket.dueDate) return false
        if (doneColumnIds.has(ticket.columnId)) return false
        const due = new Date(ticket.dueDate).getTime()
        return Number.isFinite(due) && due >= now && due <= cutoff
      })
      .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
      .slice(0, 6)
      .map((ticket) =>
        buildTaskFromTicket(ticket, columnNameById[ticket.columnId] || 'Unknown')
      )
  }, [apiTickets, buildTaskFromTicket, columnNameById, doneColumnIds])

  const boardColumnsForRules = useMemo(() => {
    if (columns.length > 0) {
      return columns.map((column) => ({ id: column.id, name: column.name }))
    }
    if (apiBoard && isApiBoardType(apiBoard) && Array.isArray(apiBoard.columns)) {
      return apiBoard.columns.map((column) => ({
        id: column.id,
        name: column.name,
      }))
    }
    return []
  }, [columns, apiBoard])

  const developmentStatusOptions = DEV_STATUS_OPTIONS

  const addGithubRule = () => {
    if (!canBoardUpdate) return
    const firstColumnId = boardColumnsForRules[0]?.id || ''
    setGithubRules((prev) => [
      ...prev,
      {
        id: createRuleId(),
        enabled: true,
        status: 'pull-requested',
        targetBranch: '',
        columnId: firstColumnId,
      },
    ])
    setRulesDirty(true)
  }

  const updateGithubRule = (id: string, updates: Partial<GithubAutomationRule>) => {
    setGithubRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    )
    setRulesDirty(true)
  }

  const removeGithubRule = (id: string) => {
    setGithubRules((prev) => prev.filter((rule) => rule.id !== id))
    setRulesDirty(true)
  }

  const handleSaveGithubRules = async () => {
    if (!apiBoard || !isApiBoardType(apiBoard) || !canBoardUpdate) return
    const settings = apiBoard.settings || { defaultView: 'board', showSwimlanes: false }
    const updated = await updateBoardAPI(apiBoard.id, {
      settings: {
        defaultView: settings.defaultView,
        showSwimlanes: settings.showSwimlanes,
        ticketDetailsSettings: settings.ticketDetailsSettings,
        githubAutomation: {
          rules: githubRules,
        },
      },
    })
    if (updated) {
      handleSaveBoardSettings(updated)
      setRulesDirty(false)
      toast.success('Development rules saved')
    } else {
      toast.error('Failed to save development rules')
    }
  }

  // Group tasks
  const groupedColumns = useMemo(() => {
    if (groupBy === 'none') {
      return { '': filteredColumns }
    }

    const groups: Record<string, Column[]> = {}
    const groupValues = new Set<string>()
    
    filteredColumns.forEach((column) => {
      column.tasks.forEach((task) => {
        let value = ''
        switch (groupBy) {
          case 'assignee':
            value = task.assignee?.name || 'Unassigned'
            break
          case 'type':
            value = task.type
            break
          case 'priority':
            value = task.priority
            break
          case 'epic':
            value = task.epic || 'No Epic'
            break
          case 'story':
            value = task.story || 'No Story'
            break
          default:
            value = 'Other'
        }
        groupValues.add(value)
      })
    })

    groupValues.forEach((groupValue) => {
      groups[groupValue] = filteredColumns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => {
          switch (groupBy) {
            case 'assignee':
              return (task.assignee?.name || 'Unassigned') === groupValue
            case 'type':
              return task.type === groupValue
            case 'priority':
              return task.priority === groupValue
            case 'epic':
              return (task.epic || 'No Epic') === groupValue
            case 'story':
              return (task.story || 'No Story') === groupValue
            default:
              return true
          }
        }),
      }))
    })

    return groups
  }, [filteredColumns, groupBy])

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const toggleUserFilter = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Removed handleSaveColumns - now handled through ConfigureBoardModal's onSave callback

  // Handle board settings save (following /workspace pattern)
  const handleSaveBoardSettings: (updatedBoard: ApiBoardType | null) => void = (updatedBoard) => {
    // Update local state with the updated board (like handleSaveEdit in /workspace)
    if (updatedBoard && isApiBoardType(updatedBoard)) {
      setApiBoard(updatedBoard)
      
      // Update columns if they changed
      if (updatedBoard.columns && Array.isArray(updatedBoard.columns) && updatedBoard.columns.length > 0) {
        const firstCol = updatedBoard.columns[0]
        if (typeof firstCol === 'object' && firstCol !== null && 'id' in firstCol && 'name' in firstCol) {
          const updatedColumns = (updatedBoard.columns as unknown as Array<{ id: string; name: string; order: number; hexColor?: string; isDoneColumn: boolean }>)
            .sort((a, b) => a.order - b.order)
            .map((col): BoardViewColumn => ({
              id: col.id,
              name: col.name,
              color: col.hexColor 
                ? `bg-[${col.hexColor}]` 
                : col.isDoneColumn 
                  ? 'bg-green-500' 
                  : col.order === 0 
                    ? 'bg-slate-400' 
                    : 'bg-blue-500',
              tasks: [], // Tasks are managed separately
            }))
          setColumns(updatedColumns)
        }
      }
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setSearchParams({ selectedTask: task.key })
  }

  const handleNavigateToTask = (taskKey: string) => {
    // Find the task by key in all columns
    for (const column of columns) {
      const task = column.tasks.find((t) => t.key === taskKey)
      if (task) {
        setSelectedTask(task)
        setSearchParams({ selectedTask: taskKey })
        break
      }
    }
  }

  const handleCloseTaskModal = () => {
    setSelectedTask(null)
    setSearchParams({})
  }

  const handleUpdateTask = (updatedTask: Task) => {
    // Find the old task to check if status changed
    const oldTask = columns
      .flatMap((col) => col.tasks)
      .find((t) => t.id === updatedTask.id)
    
    const statusChanged = oldTask && oldTask.status !== updatedTask.status
    
    // Find the new column (where the task should be based on status)
    const newColumn = columns.find((col) => col.name === updatedTask.status)
    
    setColumns((prev) => {
      // Find the old column (where the task currently is)
      const oldColumn = prev.find((col) => 
        col.tasks.some((t) => t.id === updatedTask.id)
      )
      
      // Find the new column (where the task should be based on status)
      const targetColumn = prev.find((col) => col.name === updatedTask.status)
      
      // If status changed and we found both columns, move the task
      if (oldColumn && targetColumn && oldColumn.id !== targetColumn.id) {
        // Remove from old column
        const updatedOldColumn = {
          ...oldColumn,
          tasks: oldColumn.tasks.filter((t) => t.id !== updatedTask.id),
        }
        
        // Add to new column
        const updatedNewColumn = {
          ...targetColumn,
          tasks: [...targetColumn.tasks, updatedTask],
        }
        
        // Update columns
        return prev.map((col) => {
          if (col.id === oldColumn.id) return updatedOldColumn
          if (col.id === targetColumn.id) return updatedNewColumn
          return col
        })
      } else {
        // Status didn't change or same column, just update the task in place
        return prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
        }))
      }
    })
    
    // If status changed, also update apiTickets optimistically to prevent jump-back
    if (statusChanged && newColumn) {
      setApiTickets((prev) =>
        prev.map((t) => 
          t.id === updatedTask.id 
            ? { ...t, columnId: newColumn.id }
            : t
        )
      )
    }
    
    setSelectedTask(updatedTask)
  }

  const handleUpdateTaskAssignee = async (taskId: string, assignee: Assignee | undefined) => {
    const assigneeId = assignee?.id || null
    
    // Find the ticket to get the old assignee
    const ticket = apiTickets.find((t) => t.id === taskId)
    if (!ticket) return

    const oldAssigneeId = ticket.assigneeId || null
    const oldAssignee = oldAssigneeId
      ? (assigneesFromApi.find((a) => a.id === oldAssigneeId) ||
         MOCK_ASSIGNEES.find((a) => a.id === oldAssigneeId))
      : undefined

    // Optimistically update local state
    const optimisticTicket = { ...ticket, assigneeId: assigneeId || undefined }
    setApiTickets((prev) =>
      prev.map((t) => (t.id === taskId ? optimisticTicket : t))
    )

    // Also update columns state optimistically
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => 
          t.id === taskId ? { ...t, assignee } : t
        ),
      }))
    )

    // Update selected task optimistically
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, assignee })
    }

    try {
      const updated = await updateTicketAPI(taskId, {
        assigneeId: assigneeId || null,
      })
      
      if (updated) {
        // Update with server response
        setApiTickets((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        )
      } else {
        // Revert on failure
        setApiTickets((prev) =>
          prev.map((t) => (t.id === taskId ? ticket : t))
        )
        
        // Revert columns state
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) => 
              t.id === taskId ? { ...t, assignee: oldAssignee } : t
            ),
          }))
        )

        // Revert selected task
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, assignee: oldAssignee })
        }
      }
    } catch (error) {
      console.error('Error updating task assignee:', error)
      
      // Revert on error
      setApiTickets((prev) =>
        prev.map((t) => (t.id === taskId ? ticket : t))
      )
      
      // Revert columns state
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => 
            t.id === taskId ? { ...t, assignee: oldAssignee } : t
          ),
        }))
      )

      // Revert selected task
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, assignee: oldAssignee })
      }
      toast.error('Failed to update assignee')
    }
  }

  const handleArchiveTicket = async (ticketId: string) => {
    if (!canTicketCreate) return
    const ticket = apiTickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const archivedAt = new Date().toISOString()
    const optimisticTicket = { ...ticket, archivedAt }

    setApiTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setArchivedTickets((prev) => {
      if (prev.some((t) => t.id === ticketId)) {
        return prev.map((t) => (t.id === ticketId ? optimisticTicket : t))
      }
      return [...prev, optimisticTicket]
    })

    try {
      const updated = await updateTicketAPI(ticketId, { archivedAt })
      if (updated) {
        setArchivedTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? updated : t))
        )
      } else {
        setApiTickets((prev) => [...prev, ticket])
        setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId))
      }
    } catch (error) {
      console.error('Error archiving ticket:', error)
      setApiTickets((prev) => [...prev, ticket])
      setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId))
    }
  }

  const handleUnarchiveTicket = async (ticketId: string) => {
    if (!canTicketCreate) return
    const ticket = archivedTickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const optimisticTicket = { ...ticket, archivedAt: undefined }

    setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setApiTickets((prev) => {
      if (prev.some((t) => t.id === ticketId)) {
        return prev
      }
      return [...prev, optimisticTicket]
    })

    try {
      const updated = await updateTicketAPI(ticketId, { archivedAt: null })
      if (updated) {
        setApiTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? updated : t))
        )
      } else {
        setArchivedTickets((prev) => [...prev, ticket])
        setApiTickets((prev) => prev.filter((t) => t.id !== ticketId))
      }
    } catch (error) {
      console.error('Error unarchiving ticket:', error)
      setArchivedTickets((prev) => [...prev, ticket])
      setApiTickets((prev) => prev.filter((t) => t.id !== ticketId))
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!canTicketCreate) return
    const ticket = apiTickets.find((t) => t.id === ticketId) || archivedTickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const previousTickets = apiTickets
    const previousArchived = archivedTickets
    const previousColumns = columns
    const previousSelectedTask = selectedTask

    setApiTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setArchivedTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== ticketId),
      }))
    )
    if (selectedTask?.id === ticketId) {
      setSelectedTask(null)
      setSearchParams({})
    }

    try {
      const deleted = await deleteTicketAPI(ticketId)
      if (!deleted) {
        setApiTickets(previousTickets)
        setArchivedTickets(previousArchived)
        setColumns(previousColumns)
        if (previousSelectedTask) {
          setSelectedTask(previousSelectedTask)
          setSearchParams({ selectedTask: previousSelectedTask.key })
        }
        toast.error('Failed to delete ticket')
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      setApiTickets(previousTickets)
      setArchivedTickets(previousArchived)
      setColumns(previousColumns)
      if (previousSelectedTask) {
        setSelectedTask(previousSelectedTask)
        setSearchParams({ selectedTask: previousSelectedTask.key })
      }
      toast.error('Failed to delete ticket')
    }
  }

  const handleAssignTicket = async (ticketId: string, assigneeId: string | null) => {
    // Find the ticket to get the old assignee
    const ticket = apiTickets.find((t) => t.id === ticketId)
    if (!ticket) return

    const oldAssigneeId = ticket.assigneeId || null

    // Optimistically update local state
    const optimisticTicket = { ...ticket, assigneeId: assigneeId || undefined }
    setApiTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? optimisticTicket : t))
    )

    // Also update columns state optimistically
    const assignee = assigneeId 
      ? (assigneesFromApi.find((a) => a.id === assigneeId) ||
         MOCK_ASSIGNEES.find((a) => a.id === assigneeId))
      : undefined

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => 
          t.id === ticketId ? { ...t, assignee } : t
        ),
      }))
    )

    try {
      const updated = await updateTicketAPI(ticketId, {
        assigneeId: assigneeId || null,
      })
      
      if (updated) {
        // Update with server response
        setApiTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? updated : t))
        )
      } else {
        // Revert on failure
        setApiTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? ticket : t))
        )
        
        // Revert columns state
        const oldAssignee = oldAssigneeId
          ? (assigneesFromApi.find((a) => a.id === oldAssigneeId) ||
             MOCK_ASSIGNEES.find((a) => a.id === oldAssigneeId))
          : undefined
        
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) => 
              t.id === ticketId ? { ...t, assignee: oldAssignee } : t
            ),
          }))
        )
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
      
      // Revert on error
      setApiTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? ticket : t))
      )
      
      // Revert columns state
      const oldAssignee = oldAssigneeId
        ? (assigneesFromApi.find((a) => a.id === oldAssigneeId) ||
           MOCK_ASSIGNEES.find((a) => a.id === oldAssigneeId))
        : undefined
      
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => 
            t.id === ticketId ? { ...t, assignee: oldAssignee } : t
          ),
        }))
      )
    }
  }

  // Copy link to clipboard
  const handleCopyLink = async () => {
    const boardUrl = window.location.href
    try {
      await navigator.clipboard.writeText(boardUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleOpenCreateTask = (columnId?: string) => {
    if (!canTicketCreate) return
    setCreateTaskColumnId(columnId || columns[0]?.id || null)
    setCreateTaskModalOpen(true)
  }

  // Removed handleCreateTask - now handled by CreateTaskModal calling backend API

  // Drag and drop handlers - supports reordering within same column
  const handleDragStart = (e: React.DragEvent, task: Task, columnId: string, taskIndex: number) => {
    if (!canTicketRank) return
    setDraggedTask({ task, columnId, taskIndex })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    // Add a slight delay to show the drag effect
    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId)
    }
    // When dragging over empty area of column (not over a task), set index to end
    setDragOverTaskIndex(null)
  }

  const handleDragOverTask = (e: React.DragEvent, columnId: string, taskIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    
    // Determine if we're in the top or bottom half of the task card
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const isAboveMidpoint = e.clientY < midpoint
    
    // Calculate the actual insert position
    let insertPosition = taskIndex
    if (!isAboveMidpoint) {
      insertPosition = taskIndex + 1
    }
    
    setDragOverColumn(columnId)
    setDragOverTaskIndex(insertPosition)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
      setDragOverTaskIndex(null)
    }
  }

  // Helper function to generate rank strings (lexorank-like)
  const generateRank = (index: number): string => {
    // Generate a rank string that maintains order
    // Using timestamp + index to ensure uniqueness and ordering
    const base = Date.now()
    const rankValue = base + (index * 1000) // Space between ranks for future inserts
    return `rank_${rankValue}_${Math.random().toString(36).substr(2, 9)}`
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    if (!canTicketRank) return
    e.preventDefault()
    if (!draggedTask) {
      setDraggedTask(null)
      setDragOverColumn(null)
      setDragOverTaskIndex(null)
      return
    }

    const { task, columnId: sourceColumnId, taskIndex: sourceIndex } = draggedTask
    const targetIndex = dragOverTaskIndex

    // Don't do anything if dropping in same position
    if (sourceColumnId === targetColumnId && targetIndex !== null) {
      if (targetIndex === sourceIndex || targetIndex === sourceIndex + 1) {
        setDraggedTask(null)
        setDragOverColumn(null)
        setDragOverTaskIndex(null)
        return
      }
    }

    // Find the ticket in apiTickets
    const ticket = apiTickets.find(t => t.id === task.id)
    if (!ticket || !apiBoard) {
      console.error('Ticket or board not found')
      setDraggedTask(null)
      setDragOverColumn(null)
      setDragOverTaskIndex(null)
      return
    }

    const boardId = apiBoard.id

    // Calculate new column state synchronously
    const newColumns = columns.map(col => ({ ...col, tasks: [...col.tasks] }))
    const sourceCol = newColumns.find(c => c.id === sourceColumnId)
    const targetCol = newColumns.find(c => c.id === targetColumnId)
    
    if (!sourceCol || !targetCol) {
      setDraggedTask(null)
      setDragOverColumn(null)
      setDragOverTaskIndex(null)
      return
    }

    // Calculate insert index
    let insertIndex: number
    if (targetIndex !== null) {
      if (sourceColumnId === targetColumnId) {
        // Same column: adjust index since we'll remove the item first
        insertIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
      } else {
        // Different column: use the target index directly
        insertIndex = targetIndex
      }
    } else {
      // No specific position, add to end
      insertIndex = targetCol.tasks.length
    }

    // Ensure index is within bounds
    insertIndex = Math.max(0, Math.min(insertIndex, targetCol.tasks.length))

    // Remove from source
    sourceCol.tasks.splice(sourceIndex, 1)

    // Insert at target position
    targetCol.tasks.splice(insertIndex, 0, { ...task, status: targetColumnId })

    // Store old state for rollback
    const oldColumns = columns

    // Optimistically update local state - BOTH columns AND apiTickets to prevent jump-back
    setColumns(newColumns)
    
    // Track this optimistic update to prevent useEffect from overwriting it
    // This applies to both column moves and same-column reorders
    optimisticUpdatesRef.current.add(task.id)
    
    // Also update apiTickets optimistically to keep state in sync
    if (sourceColumnId !== targetColumnId) {
      // Track this move to prevent socket event from interfering
      recentMovesRef.current.set(task.id, Date.now())
      
      // Update apiTickets with new columnId immediately
      setApiTickets((prev) =>
        prev.map((t) => 
          t.id === task.id 
            ? { ...t, columnId: targetColumnId } // Update columnId immediately
            : t
        )
      )
      
      // Clean up old move tracking after 3 seconds
      setTimeout(() => {
        recentMovesRef.current.delete(task.id)
      }, 3000)
    }
    
    setDraggedTask(null)
    setDragOverColumn(null)
    setDragOverTaskIndex(null)

    try {
      // If moving between columns, call moveTicket API
      if (sourceColumnId !== targetColumnId) {
        const movedTicket = await moveTicketAPI(task.id, targetColumnId)
        if (!movedTicket) {
          throw new Error('Failed to move ticket')
        }
        // Update apiTickets with the moved ticket from backend (this will have all the correct data)
        setApiTickets((prev) =>
          prev.map((t) => (t.id === task.id ? movedTicket : t))
        )
      }

      // Calculate new ranks for all tickets in affected columns
      const rankUpdates: Array<{ id: string; rank: string }> = []
      
      // Update ranks in target column
      targetCol.tasks.forEach((t, index) => {
        const apiTicket = apiTickets.find(apiT => apiT.id === t.id) || (t.id === task.id ? ticket : null)
        if (apiTicket) {
          rankUpdates.push({
            id: apiTicket.id,
            rank: generateRank(index),
          })
        }
      })

      // Update ranks in source column (if different column)
      if (sourceColumnId !== targetColumnId) {
        sourceCol.tasks.forEach((t, index) => {
          const apiTicket = apiTickets.find(apiT => apiT.id === t.id)
          if (apiTicket) {
            rankUpdates.push({
              id: apiTicket.id,
              rank: generateRank(index),
            })
          }
        })
      }

      // Call bulk update ranks API (for both column moves and same-column reorders)
      if (rankUpdates.length > 0) {
        const response = await axiosInstance.post<{ success: boolean; data: Ticket[] }>(
          BULK_UPDATE_RANKS(boardId),
          { rankUpdates }
        )
        
        if (response.data.success && response.data.data) {
          // Update apiTickets with the updated tickets
          setApiTickets((prev) => {
            const updatedMap = new Map(response.data.data.map(t => [t.id, t]))
            return prev.map(t => updatedMap.get(t.id) || t)
          })
        }
      }
      
      // All optimistic updates for this ticket are now confirmed - remove from tracking
      // This happens after both column move (if any) and rank updates are complete
      optimisticUpdatesRef.current.delete(task.id)
    } catch (error) {
      console.error('Error moving ticket:', error)
      
      // Remove from optimistic updates tracking
      optimisticUpdatesRef.current.delete(task.id)
      
      // Revert only this specific ticket, not all changes
      // This allows other simultaneous moves to continue
      setColumns((prevColumns) => {
        return prevColumns.map((column) => {
          // Find the ticket in the old state
          const oldColumn = oldColumns.find(c => c.id === column.id)
          if (!oldColumn) return column
          
          // Check if this ticket was in this column before
          const ticketWasHere = oldColumn.tasks.some(t => t.id === task.id)
          const ticketIsHere = column.tasks.some(t => t.id === task.id)
          
          if (ticketWasHere && !ticketIsHere) {
            // Ticket was here before but isn't now - restore it
            const oldTask = oldColumn.tasks.find(t => t.id === task.id)
            if (oldTask) {
              return {
                ...column,
                tasks: [...column.tasks, oldTask]
              }
            }
          } else if (!ticketWasHere && ticketIsHere) {
            // Ticket is here but shouldn't be - remove it
            return {
              ...column,
              tasks: column.tasks.filter(t => t.id !== task.id)
            }
          }
          
          return column
        })
      })
      
      // Revert apiTickets for this specific ticket only
      setApiTickets((prev) => 
        prev.map((t) => t.id === task.id ? ticket : t)
      )
      
      // Show error toast
      toast.error('Failed to move ticket')
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    
    setDraggedTask(null)
    setDragOverColumn(null)
    setDragOverTaskIndex(null)
  }

  // Show loading state
  if (isLoading) {
    return (
      <section className="space-y-4">
        {/* Board Header Skeleton */}
        <header className="space-y-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-lg" />
            ))}
          </div>
        </header>

        {/* Board Content Skeleton */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((colIndex) => (
            <div key={colIndex} className="min-w-[280px] space-y-3">
              <div className="flex items-center justify-between p-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-8 rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((taskIndex) => (
                  <div key={taskIndex} className="border border-border rounded-lg p-3 space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Show error or not found
  if (!board) {
    const isNotFound = boardError?.statusCode === 404 || (!apiBoard && !boardKey)
    
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">
          {isNotFound ? 'Board not found' : 'Unable to load board'}
        </p>
        <Button variant="outline" onClick={() => navigate('/workspace')}>
          Back to Workspace
        </Button>
      </div>
    )
  }

  // Removed totalTasks - not used in new header design

  return (
    <section className="space-y-4">
      {/* Board Header */}
      <header className="space-y-4 pb-4 border-b border-border">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Welcome
          </span>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCopyLink}
              title={linkCopied ? 'Link copied!' : 'Copy link'}
            >
              {linkCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Board Title Section - Prominent */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{board.icon}</span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {board.name}
            </h1>
            <span className="text-sm font-medium text-muted-foreground">
              {board.key}
            </span>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => handleTabChange('summary')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'summary'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Summary</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('board')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'board'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>Board</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('list')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'list'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span>List</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('timeline')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'timeline'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Timeline</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('development')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'development'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span>Development</span>
            </div>
          </button>
          <button
            onClick={() => handleTabChange('archived')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
              activeTab === 'archived'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span>Archived</span>
            </div>
          </button>
        </div>

        {showBoardControls ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Left side - Search, Assignee, Filters */}
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search board"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  aria-label="Search board"
                />
              </div>

              {/* Assignee filter - circles with profile pictures */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 px-2 sm:px-3"
                    title="Assignees"
                    aria-label="Assignees"
                  >
                    <div className="flex -space-x-1">
                      {selectedUsers.length > 0 ? (
                        selectedUsers.slice(0, 3).map((userId) => {
                          const user = MOCK_ASSIGNEES.find((a) => a.id === userId)
                          return user ? (
                            <div
                              key={user.id}
                              className={cn(
                                'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white ring-2 ring-background',
                                user.color
                              )}
                              title={user.name}
                            >
                              {user.initials}
                            </div>
                          ) : null
                        })
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    {selectedUsers.length > 3 && (
                      <span className="text-xs">+{selectedUsers.length - 3}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {MOCK_ASSIGNEES.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => toggleUserFilter(user.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white',
                            user.color
                          )}
                        >
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {selectedUsers.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSelectedUsers([])}
                        className="cursor-pointer text-muted-foreground"
                      >
                        Clear filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filters dropdown */}
              <FilterDropdown
                tasks={allTasks}
                assignees={assigneesFromApi.length > 0 ? assigneesFromApi : MOCK_ASSIGNEES}
                selectedFilters={selectedFilters}
                onFiltersChange={(filters) => {
                  setSelectedFilters(filters)
                  // Sync assignee filter to outside filter
                  setSelectedUsers(filters.assignee)
                }}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-9 gap-1.5 px-2 sm:px-3",
                    (selectedFilters.type.length > 0 ||
                     selectedFilters.assignee.length > 0 ||
                     selectedFilters.labels.length > 0 ||
                     selectedFilters.status.length > 0 ||
                     selectedFilters.priority.length > 0) && "bg-primary/10 border-primary"
                  )}
                  title="Filters"
                  aria-label="Filters"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {(selectedFilters.type.length > 0 ||
                    selectedFilters.assignee.length > 0 ||
                    selectedFilters.labels.length > 0 ||
                    selectedFilters.status.length > 0 ||
                    selectedFilters.priority.length > 0) && (
                    <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      {selectedFilters.type.length +
                        selectedFilters.assignee.length +
                        selectedFilters.labels.length +
                        selectedFilters.status.length +
                        selectedFilters.priority.length}
                    </span>
                  )}
                </Button>
              </FilterDropdown>
            </div>

            {/* Right side - Group, Create, Settings */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 px-2 sm:px-3"
                    title="Group"
                    aria-label="Group"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Group</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {GROUP_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setGroupBy(option.value)}
                      className={cn(
                        'cursor-pointer',
                        groupBy === option.value && 'bg-accent'
                      )}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                size="sm"
                className="h-9 gap-1.5 px-2 sm:px-3"
                onClick={() => handleOpenCreateTask()}
                disabled={!canTicketCreate}
                title="Create ticket"
                aria-label="Create ticket"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 px-2 sm:px-3"
                onClick={() => setConfigureModalOpen(true)}
                disabled={!canBoardUpdate}
                title="Settings"
                aria-label="Settings"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-2 sm:px-3"
              onClick={() => setConfigureModalOpen(true)}
              disabled={!canBoardUpdate}
              title="Settings"
              aria-label="Settings"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        )}
      </header>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {apiTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No tickets yet</h3>
                <p className="text-muted-foreground">
                  Create a few tickets to see insights for this board.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-semibold text-foreground">{summaryStats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.openCount} open · {summaryStats.doneCount} done
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-semibold text-foreground">{summaryStats.openCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summaryStats.upcomingCount} due soon
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Done Tickets</p>
                  <p className="text-2xl font-semibold text-foreground">{summaryStats.doneCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg cycle {formatDuration(summaryStats.avgCompletionMs)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-semibold text-foreground">{summaryStats.overdueCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Needs attention this week
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Avg Open Age</p>
                  <p className="text-2xl font-semibold text-foreground">{formatDuration(summaryStats.avgOpenMs)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Since creation
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Columns</p>
                  <p className="text-2xl font-semibold text-foreground">{columnBreakdown.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active workflow stages
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Tickets by Column</h3>
                    <span className="text-xs text-muted-foreground">Distribution</span>
                  </div>
                  {columnPieData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No column data yet.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={columnPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                          >
                            {columnPieData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={24} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Done vs Not Done</h3>
                    <span className="text-xs text-muted-foreground">Completion split</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={doneVsNotData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="done" fill="#22c55e" radius={[6, 6, 0, 0]} />
                        <Line type="monotone" dataKey="notDone" stroke="#f97316" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card/30 p-4 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Column Breakdown</h3>
                    <span className="text-xs text-muted-foreground">Tickets per column</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {columnBreakdown.map((column) => (
                      <div key={column.id} className="rounded-lg border border-border/50 bg-background/60 p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: getHexColor(column.color) || '#94a3b8' }}
                          />
                          <span className="text-sm font-medium text-foreground truncate">{column.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{column.count}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {column.tasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No tickets</p>
                          ) : (
                            <>
                              {column.tasks.slice(0, 3).map((task) => (
                                <p key={task.id} className="text-xs text-muted-foreground truncate">
                                  {task.key} · {task.title}
                                </p>
                              ))}
                              {column.tasks.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{column.tasks.length - 3} more
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Priority Mix</h3>
                    <span className="text-xs text-muted-foreground">Current load</span>
                  </div>
                  <div className="space-y-3">
                    {priorityStats.map((stat) => (
                      <div key={stat.priority} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{getPriorityLabel(stat.priority)}</span>
                          <span>{stat.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/40">
                          <div
                            className="h-2 rounded-full bg-primary/70"
                            style={{ width: `${(stat.count / maxPriorityCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Your Work</h3>
                    <span className="text-xs text-muted-foreground">Most recent tickets</span>
                  </div>
                  {userTicketRanking.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tickets assigned or reported yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {userTicketRanking.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {task.key} · {task.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.status} · {getPriorityLabel(task.priority)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(task.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Upcoming Due</h3>
                    <span className="text-xs text-muted-foreground">Next 7 days</span>
                  </div>
                  {upcomingTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming due dates.</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingTickets.map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {task.key} · {task.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.status} · {getPriorityLabel(task.priority)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {task.dueDate ? task.dueDate.toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'board' && (
        <div
          ref={boardContainerRef}
          className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6"
        >
          {columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No columns yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by adding columns to organize your tasks. Click the Settings button to configure your board.
                </p>
                <Button
                  onClick={() => setConfigureModalOpen(true)}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Configure Board
                </Button>
              </div>
            </div>
          ) : (
            Object.entries(groupedColumns).map(([groupName, cols]) => (
            <div key={groupName || 'default'} className="mb-4">
            {/* Group Header (if grouped) */}
            {groupBy !== 'none' && groupName && (
              <button
                onClick={() => toggleGroup(groupName)}
                className="flex items-center gap-2 py-2 group"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    !collapsedGroups.has(groupName) && 'rotate-90'
                  )}
                />
                <span className="font-medium capitalize">{groupName}</span>
                <span className="text-sm text-muted-foreground">
                  ({cols.reduce((acc, col) => acc + col.tasks.length, 0)})
                </span>
              </button>
            )}

            {/* Columns */}
            {!collapsedGroups.has(groupName) && (
              <div className="flex gap-3 pb-4">
                {cols.map((column) => (
                  <div
                    key={column.id}
                    className={cn(
                      'w-[280px] flex-shrink-0 flex flex-col rounded-lg transition-colors',
                      dragOverColumn === column.id
                        ? 'bg-accent/50 ring-2 ring-primary/50'
                        : 'bg-muted/30'
                    )}
                    onDragOver={(e) => handleDragOverColumn(e, column.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    {/* Column Header */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
                      <div className={cn('w-3 h-3 rounded-sm flex-shrink-0', column.color)} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                        {column.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {column.tasks.length}
                      </span>
                      {column.name === 'QA PASSED' && (
                        <CheckSquare className="h-4 w-4 text-green-500 ml-auto flex-shrink-0" />
                      )}
                      {column.name === 'QA FAILED' && (
                        <span className="ml-auto text-red-500 text-sm flex-shrink-0">✕</span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 p-2 min-h-[120px]">
                      {column.tasks.map((task, taskIndex) => (
                        <div key={task.id} className="relative">
                          {/* Drop indicator line - shows above this task */}
                          {dragOverColumn === column.id && 
                           dragOverTaskIndex === taskIndex && 
                           draggedTask?.task.id !== task.id && (
                            <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
                          )}
                          
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, task, column.id, taskIndex)}
                            onDragOver={(e) => handleDragOverTask(e, column.id, taskIndex)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              'bg-card hover:bg-accent/50 border border-border/50 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md mb-2 relative',
                              draggedTask?.task.id === task.id && 'opacity-40 scale-[0.98]'
                            )}
                            style={{
                              borderLeftWidth: '4px',
                              borderLeftColor: getHexColor(column.color),
                            }}
                          >
                            {/* Header: Title and More Options */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p 
                                className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1 cursor-pointer"
                                onClick={() => handleTaskClick(task)}
                              >
                                {task.title}
                              </p>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
                                  >
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleTaskClick(task)}
                                    className="cursor-pointer"
                                  >
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleArchiveTicket(task.id)}
                                    disabled={!canTicketCreate}
                                    className="cursor-pointer"
                                  >
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive cursor-pointer"
                                    disabled={!canTicketCreate}
                                    onClick={() => handleDeleteTicket(task.id)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Footer: Type on left, Priority/Assignee on right */}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/30">
                              {/* Left: Type Icon and Type Name */}
                              <div className="flex items-center gap-1.5">
                                {getTaskTypeIcon(task.type, 'h-3.5 w-3.5')}
                                <span className="text-xs text-muted-foreground capitalize">
                                  {task.type}
                                </span>
                              </div>

                              {/* Right: Red dot (if overdue), Priority, Assignee */}
                              <div className="flex items-center gap-1.5">
                                {/* Red dot if overdue */}
                                {task.dueDate && new Date(task.dueDate) < new Date() && (
                                  <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                )}
                                {/* Priority */}
                                <div className="flex items-center">
                                  {getPriorityIcon(task.priority)}
                                </div>
                                {/* Assignee - Clickable */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-shrink-0"
                                    >
                                      {task.assignee ? (
                                        <div
                                          className={cn(
                                            'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
                                            task.assignee.color
                                          )}
                                          title={task.assignee.name}
                                        >
                                          {task.assignee.initials}
                                        </div>
                                      ) : (
                                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const ticket = apiTickets.find((t) => t.id === task.id)
                                        if (ticket) {
                                          handleAssignTicket(ticket.id, null)
                                        }
                                      }}
                                    >
                                      Unassigned
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {(assigneesFromApi.length > 0
                                      ? assigneesFromApi.map((u) => ({
                                          id: u.id,
                                          name: u.name,
                                          initials: u.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
                                          color: MOCK_ASSIGNEES.find((m) => m.id === u.id)?.color || 'bg-blue-500',
                                        }))
                                      : MOCK_ASSIGNEES
                                    ).map((assignee) => (
                                      <DropdownMenuItem
                                        key={assignee.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const ticket = apiTickets.find((t) => t.id === task.id)
                                          if (ticket) {
                                            handleAssignTicket(ticket.id, assignee.id)
                                          }
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={cn(
                                              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white',
                                              assignee.color
                                            )}
                                          >
                                            {assignee.initials}
                                          </div>
                                          <span>{assignee.name}</span>
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                          
                          {/* Drop indicator line - shows after last task */}
                          {dragOverColumn === column.id && 
                           dragOverTaskIndex === taskIndex + 1 && 
                           taskIndex === column.tasks.length - 1 &&
                           draggedTask?.task.id !== task.id && (
                            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
                          )}
                        </div>
                      ))}

                      {/* Create button - appears after last task card */}
                      {column.tasks.length > 0 && (
                        <button
                          onClick={() => handleOpenCreateTask(column.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-lg border border-dashed border-border/50 hover:border-primary/50 bg-card"
                          disabled={!canTicketCreate}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-sm">Create</span>
                        </button>
                      )}

                      {/* Drop indicator for empty column or dropping at end */}
                      {dragOverColumn === column.id && column.tasks.length === 0 && (
                        <div className="border-2 border-dashed border-primary/50 rounded-lg p-4 text-center bg-primary/5">
                          <p className="text-sm text-muted-foreground">Drop here</p>
                        </div>
                      )}

                      {/* Empty state - only show when not dragging */}
                      {column.tasks.length === 0 && !dragOverColumn && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            {searchQuery || selectedUsers.length > 0
                              ? 'No matching issues'
                              : 'No issues'}
                          </p>
                          {/* Create button for empty column */}
                          <button
                            onClick={() => handleOpenCreateTask(column.id)}
                            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-lg border border-dashed border-border/50 hover:border-primary/50"
                            disabled={!canTicketCreate}
                          >
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Create</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ))
        )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Get filtered tasks from filteredColumns (respects all filters)
                  const filteredTasks = filteredColumns.flatMap((col) => col.tasks)
                  return filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {searchQuery || selectedUsers.length > 0 || 
                         selectedFilters.type.length > 0 || 
                         selectedFilters.labels.length > 0 ||
                         selectedFilters.status.length > 0 ||
                         selectedFilters.priority.length > 0
                          ? 'No matching tasks found'
                          : 'No tasks found'}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {task.key}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {task.title}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTaskTypeIcon(task.type, 'h-4 w-4')}
                          <span className="text-sm text-muted-foreground capitalize">
                            {task.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white',
                                task.assignee.color
                              )}
                              title={task.assignee.name}
                            >
                              {task.assignee.initials}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(task.priority)}
                          <span className="text-sm text-muted-foreground">
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </td>
                    </tr>
                    ))
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              The timeline view is under development and will be available soon.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'development' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/50 bg-card/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">GitHub Actions Listener</h3>
                <p className="text-xs text-muted-foreground">
                  Incoming status updates apply to all tickets and follow your rules.
                </p>
              </div>
              {canBoardUpdate && (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 px-3"
                  onClick={addGithubRule}
                  disabled={boardColumnsForRules.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Add rule
                </Button>
              )}
            </div>
            <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
              <p>Match by status + target branch. Use <span className="font-medium">main</span> or <span className="font-medium">release/*</span>.</p>
              <p>If no rules match, the ticket keeps its column but updates its GitHub status and branch.</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Automation Rules</h3>
                <p className="text-xs text-muted-foreground">
                  First matching rule wins. Reorder by removing/adding if needed.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {githubRules.length} rule{githubRules.length === 1 ? '' : 's'}
              </Badge>
            </div>
            {githubRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-4xl mb-3">🔭</div>
                <p className="text-sm text-muted-foreground">
                  No rules yet. GitHub updates will only sync status and branch metadata.
                </p>
                {canBoardUpdate && (
                  <Button
                    size="sm"
                    className="mt-4 h-9 gap-1.5 px-3"
                    onClick={addGithubRule}
                    disabled={boardColumnsForRules.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Create your first rule
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {githubRules.map((rule, index) => {
                  const statusMeta =
                    developmentStatusOptions.find((option) => option.value === rule.status) ||
                    ({ label: rule.status, tone: 'neutral' } as const)
                  return (
                    <div key={rule.id} className="p-4">
                      <div className="grid gap-4 lg:grid-cols-[auto_minmax(200px,1fr)_minmax(200px,1fr)_minmax(220px,1fr)_auto]">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) =>
                              updateGithubRule(rule.id, { enabled: checked })
                            }
                            disabled={!canBoardUpdate}
                          />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                          <select
                            value={rule.status}
                            onChange={(event) =>
                              updateGithubRule(rule.id, { status: event.target.value as GithubStatus })
                            }
                            disabled={!canBoardUpdate}
                            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {developmentStatusOptions.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <Badge
                            variant="outline"
                            className={cn('w-fit text-[11px]', DEV_TONE_CLASSES[statusMeta.tone])}
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Target Branch</p>
                          <Input
                            value={rule.targetBranch || ''}
                            onChange={(event) =>
                              updateGithubRule(rule.id, { targetBranch: event.target.value })
                            }
                            placeholder="main or release/*"
                            disabled={!canBoardUpdate}
                            className="h-9"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Use <span className="font-medium">*</span> for any branch.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Move To</p>
                          <select
                            value={rule.columnId}
                            onChange={(event) =>
                              updateGithubRule(rule.id, { columnId: event.target.value })
                            }
                            disabled={!canBoardUpdate}
                            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="" disabled>
                              Select column
                            </option>
                            {boardColumnsForRules.map((column) => (
                              <option key={column.id} value={column.id}>
                                {column.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-start justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGithubRule(rule.id)}
                            disabled={!canBoardUpdate}
                            aria-label={`Remove rule ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Rules run top-to-bottom. First match wins.
              </p>
              {canBoardUpdate && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="border border-border/60"
                  onClick={handleSaveGithubRules}
                  disabled={!rulesDirty || updateBoardLoading}
                >
                  {updateBoardLoading ? 'Saving…' : 'Save rules'}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Webhook Payload</h3>
            </div>
            <pre className="rounded-lg border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground overflow-x-auto">
{`{
  "branchName": "feature/TT-1/add-cta",
  "targetBranch": "main",
  "status": "pull-requested",
  "pullRequestUrl": "https://github.com/org/repo/pull/44"
}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              branchName is the source branch and must include a ticket segment like /TT-1/. targetBranch is optional for pushes. pullRequestUrl is optional for PR events.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'archived' && (
        <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {archivedTicketsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Loading archived tickets...
                    </td>
                  </tr>
                ) : (() => {
                  const filteredTasks = filteredArchivedTasks
                  return filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {searchQuery || selectedUsers.length > 0 || 
                         selectedFilters.type.length > 0 || 
                         selectedFilters.labels.length > 0 ||
                         selectedFilters.status.length > 0 ||
                         selectedFilters.priority.length > 0
                          ? 'No matching tasks found'
                          : 'No archived tasks found'}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {task.key}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {task.title}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTaskTypeIcon(task.type, 'h-4 w-4')}
                          <span className="text-sm text-muted-foreground capitalize">
                            {task.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white',
                                task.assignee.color
                              )}
                              title={task.assignee.name}
                            >
                              {task.assignee.initials}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(task.priority)}
                          <span className="text-sm text-muted-foreground">
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleUnarchiveTicket(task.id)
                          }}
                          disabled={!canTicketCreate}
                        >
                          Unarchive
                        </Button>
                      </td>
                    </tr>
                    ))
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configure Board Modal */}
      <ConfigureBoardModal
        open={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        board={apiBoard && isApiBoardType(apiBoard) ? apiBoard : null}
        columns={columns}
        onSave={handleSaveBoardSettings}
      />


      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          open={!!selectedTask}
          onClose={handleCloseTaskModal}
          task={selectedTask}
          columns={columns}
          onUpdate={handleUpdateTask}
          onUpdateAssignee={handleUpdateTaskAssignee}
          boardKey={board.key}
          boardId={apiBoard && isApiBoardType(apiBoard) ? apiBoard.id : undefined}
          board={apiBoard && isApiBoardType(apiBoard) ? apiBoard : undefined}
          onNavigateToTask={handleNavigateToTask}
          canEdit={canTicketCreate}
          canComment={canTicketCreate}
        />
      )}

      {/* Create Task Modal */}
      {apiBoard && isApiBoardType(apiBoard) && canTicketCreate && (
        <CreateTaskModal
          open={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          columns={columns}
          selectedColumnId={createTaskColumnId}
          boardId={apiBoard.id}
          assignees={assigneesFromApi.length > 0 ? assigneesFromApi : MOCK_ASSIGNEES}
          canCreate={canTicketCreate}
          canRead={hasBoardFullAccess || boardRole !== 'none'}
          onSuccess={() => {
            // Refetch tickets after creation
            if (apiBoard && isApiBoardType(apiBoard)) {
              axiosInstance.get<{ success: boolean; data: Ticket[] }>(
                GET_TICKETS_BY_BOARD(apiBoard.id)
              ).then((response) => {
                if (response.data.success && response.data.data) {
                  setApiTickets(response.data.data)
                }
              }).catch((error) => {
                console.error('Error fetching tickets:', error)
              })
            }
          }}
        />
      )}
    </section>
  )
}
