import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/utils/axios.instance'
import { GET_TICKET_BY_ID, GET_TICKETS_BY_BOARD, UPDATE_TICKET, GET_USERS, CREATE_COMMENT, ADD_RELATED_TICKET, REMOVE_RELATED_TICKET } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import type { Task, Column, Assignee, Priority } from './types'
import type { Ticket } from '@/types/board'
import {
  TaskDetailHeader,
  TaskTitleSection,
  TaskSubtasksSection,
  TaskRelatedTicketsSection,
  TaskActivitySection,
  TaskSidebar,
  AcceptanceCriteriaSection,
  DocumentsSection,
} from './TaskDetailComponents'
import type { TicketDetailResponse } from './TaskDetailComponents/types'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

type TaskDetailModalProps = {
  open: boolean
  onClose: () => void
  task: Task
  columns: Column[]
  onUpdate: (task: Task) => void
  onUpdateAssignee?: (taskId: string, assignee: Assignee | undefined) => Promise<void>
  boardKey: string
  boardId?: string
  board?: {
    id: string
    settings?: {
      ticketDetailsSettings?: {
        fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
      }
    }
  }
  onNavigateToTask?: (taskKey: string) => void
  fullPage?: boolean
}

// Helper function to convert Ticket to Task
const ticketToTask = (ticket: Ticket, columns: Column[], users: Array<{ id: string; name: string; profilePic?: string }>, originalTask: Task): Task => {
  const column = columns.find((col) => col.id === ticket.columnId)
  const status = column?.name || originalTask.status
  
  let assignee: Assignee | undefined = undefined
  if (ticket.assigneeId) {
    const userData = users.find((u) => u.id === ticket.assigneeId)
    if (userData) {
      const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      assignee = {
        id: userData.id,
        name: userData.name,
        initials,
        color: 'bg-cyan-500',
        avatar: userData.profilePic,
      }
    }
  }

  // Handle description - it's a RichTextDoc object, not a string
  const description = ticket.description || originalTask.description

  return {
    ...originalTask,
    id: ticket.id,
    key: ticket.ticketKey,
    title: ticket.title,
    description, // Use ticket.description directly (RichTextDoc)
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
    type: ticket.ticketType,
  }
}

export function TaskDetailModal({
  open,
  onClose,
  task,
  columns,
  onUpdate,
  onUpdateAssignee,
  boardKey,
  boardId,
  board,
  onNavigateToTask,
  fullPage = false,
}: TaskDetailModalProps) {
  // UI State
  const [descriptionExpanded, setDescriptionExpanded] = useState(true)
  const [acceptanceCriteriaExpanded, setAcceptanceCriteriaExpanded] = useState(true)
  const [documentsExpanded, setDocumentsExpanded] = useState(true)
  const [subtasksExpanded, setSubtasksExpanded] = useState(true)
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('comments')
  const [newComment, setNewComment] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState<'dueDate' | 'startDate' | 'endDate' | null>(null)
  const [newBranchName, setNewBranchName] = useState('')

  // Core Data State - ticketDetails is the single source of truth
  const [ticketDetails, setTicketDetails] = useState<TicketDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string; profilePic?: string }>>([])
  // Track pending updates to prevent refetching stale data
  const pendingUpdateRef = useRef<{ columnId: string; timestamp: number } | null>(null)
  
  // Derived State - computed from ticketDetails
  const editedTask = useMemo(() => {
    if (!ticketDetails) return task
    return ticketToTask(ticketDetails.ticket, columns, users, task)
  }, [ticketDetails, columns, users, task])

  // Related Data State
  const [epicTicket, setEpicTicket] = useState<Ticket | null>(null)
  const [availableEpics, setAvailableEpics] = useState<Ticket[]>([])
  const [loadingEpics, setLoadingEpics] = useState(false)
  const [updatingEpic, setUpdatingEpic] = useState(false)
  const [viewers, setViewers] = useState<(Assignee & { viewedAgainAt?: string })[]>([])
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([]) // For related tickets section and parent selection
  const [githubBranches, setGithubBranches] = useState<Array<{ name: string; status: 'merged' | 'open' | 'closed'; pullRequestUrl?: string }>>([])
  // Details settings are now read-only from board settings
  const detailsSettings = board?.settings?.ticketDetailsSettings || null
  
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const canUpdateTicket = can(PERMISSIONS.TICKET_UPDATE) || can(PERMISSIONS.TICKET_FULL_ACCESS)
  const canCreateTicket = can(PERMISSIONS.TICKET_CREATE) || can(PERMISSIONS.TICKET_FULL_ACCESS)
  const canRelateTicket = can(PERMISSIONS.TICKET_RELATION) || can(PERMISSIONS.TICKET_FULL_ACCESS)
  const canComment = can(PERMISSIONS.TICKET_COMMENT_CREATE) || can(PERMISSIONS.TICKET_FULL_ACCESS)

  // Function to fetch ticket details (non-blocking)
  const fetchTicketDetails = async (force = false): Promise<TicketDetailResponse | null> => {
    if (!task.id) return null
    
    // Skip fetch if we have a pending update (unless forced)
    if (!force && pendingUpdateRef.current) {
      const timeSinceUpdate = Date.now() - pendingUpdateRef.current.timestamp
      // If update was less than 3 seconds ago, skip fetch to avoid overwriting optimistic update
      if (timeSinceUpdate < 3000) {
        return null
      }
    }
    
    // Don't set loading to true immediately - allow optimistic rendering
    try {
      const response = await axiosInstance.get<{ success: boolean; data: TicketDetailResponse }>(
        GET_TICKET_BY_ID(task.id)
      )
      if (response.data.success && response.data.data) {
        // Only update if we don't have a pending update with different columnId
        if (!pendingUpdateRef.current || 
            pendingUpdateRef.current.columnId === response.data.data.ticket.columnId) {
          setTicketDetails(response.data.data)
          // Clear pending update if it matches
          if (pendingUpdateRef.current?.columnId === response.data.data.ticket.columnId) {
            pendingUpdateRef.current = null
          }
        }
        // Track view when ticket is loaded (backend handles this automatically in getTicketById)
        handleView()
        
        // Fetch epic ticket if rootEpicId exists - don't block on this
        const rootEpicId = response.data.data.ticket.rootEpicId
        if (rootEpicId) {
          // Fetch epic ticket - non-blocking
          axiosInstance.get<{ success: boolean; data: TicketDetailResponse }>(
            GET_TICKET_BY_ID(rootEpicId)
          )
            .then((epicResponse) => {
              if (epicResponse.data.success && epicResponse.data.data) {
                setEpicTicket(epicResponse.data.data.ticket)
              } else {
                console.warn('Epic ticket fetch returned unsuccessful response')
              }
            })
            .catch((error) => {
              console.error('Error fetching epic ticket:', error)
            })
        } else {
          setEpicTicket(null)
        }
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('Error fetching ticket details:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Fetch all data in parallel when modal opens
  useEffect(() => {
    if (!open || !task.id) return
    
    // Only show loading if we don't have ticket details yet
    if (!ticketDetails) {
      setLoading(true)
    }

    // Fetch all non-blocking data in parallel
    Promise.all([
      fetchTicketDetails(),
      axiosInstance
        .get<{ status: string; data: Array<{ id: string; name: string; profilePic?: string }> }>(GET_USERS())
        .then((response) => {
          if (response.data.data) {
            setUsers(response.data.data)
          }
        })
        .catch((error) => {
          console.error('Error fetching users:', error)
        }),
      boardId 
        ? axiosInstance
            .get<{ success: boolean; data: Ticket[] }>(GET_TICKETS_BY_BOARD(boardId))
            .then((response) => {
              if (response.data.success && response.data.data) {
                setAvailableTickets(response.data.data)
              }
            })
            .catch((error) => {
              console.error('Error fetching tickets:', error)
            })
        : Promise.resolve(),
    ]).catch((error) => {
      console.error('Error fetching parallel data:', error)
    })
  }, [open, task.id, boardId])


  // Initialize viewers from ticket.viewedBy
  useEffect(() => {
    if (!ticketDetails?.ticket || !users.length) {
      setViewers([])
      return
    }

    const viewedBy = (ticketDetails.ticket as any).viewedBy
    if (!Array.isArray(viewedBy)) {
      setViewers([])
      return
    }

    const viewersList: (Assignee & { viewedAgainAt?: string })[] = []
    viewedBy.forEach((viewer: { userId: string; viewedAt: string; viewedAgainAt?: string }) => {
      const userData = users.find((u) => u.id === viewer.userId)
      if (userData) {
        const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        viewersList.push({
          id: userData.id,
          name: userData.name,
          initials,
          color: 'bg-cyan-500',
          avatar: userData.profilePic,
          viewedAgainAt: viewer.viewedAgainAt,
        })
      }
    })
    
    const sorted = [...viewersList].sort((a, b) => {
      const aViewer = viewedBy.find((v: { userId: string; viewedAt: string; viewedAgainAt?: string }) => v.userId === a.id)
      const bViewer = viewedBy.find((v: { userId: string; viewedAt: string; viewedAgainAt?: string }) => v.userId === b.id)
      if (!aViewer || !bViewer) return 0
      // Sort by viewedAgainAt if available, otherwise by viewedAt
      const aTime = aViewer.viewedAgainAt ? new Date(aViewer.viewedAgainAt).getTime() : new Date(aViewer.viewedAt).getTime()
      const bTime = bViewer.viewedAgainAt ? new Date(bViewer.viewedAgainAt).getTime() : new Date(bViewer.viewedAt).getTime()
      return bTime - aTime
    })
    
    setViewers(sorted)
  }, [ticketDetails?.ticket, users])

  // Initialize GitHub branches from ticket details
  useEffect(() => {
    if (ticketDetails?.ticket.github?.branchName) {
      setGithubBranches([{
        name: ticketDetails.ticket.github.branchName,
        status: ticketDetails.ticket.github.status || 'open',
        pullRequestUrl: ticketDetails.ticket.github.pullRequestUrl,
      }])
    } else {
      setGithubBranches([])
    }
  }, [ticketDetails?.ticket.github])

  // Handle view tracking - called when user views the ticket
  const handleView = async () => {
    if (!ticketDetails?.ticket.id || !user?.id) return

    // View tracking is handled automatically by backend when fetching ticket
    // This function can be called explicitly if needed
    // The backend tracks views in getTicketById, so we don't need to make a separate call
    // But we can optimistically update the viewedBy array if needed
    try {
      // The view is already tracked when we fetch the ticket
      // If we need to track it separately, we would call an endpoint here
      // For now, it's handled automatically by the backend
    } catch (error) {
      // Silent fail for view tracking
      console.error('Error tracking view:', error)
    }
  }

  const handleUpdateDescription = async (description: string | Record<string, any>) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldDescription = ticketDetails.ticket.description
    // Convert to RichTextDoc format if it's a string
    const descriptionDoc = typeof description === 'string' 
      ? (description ? (description.startsWith('{') ? JSON.parse(description) : {}) : {})
      : (description || {})

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        description: descriptionDoc,
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { description: descriptionDoc },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            description: oldDescription,
          },
        } : null)
        toast.error('Failed to update description')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          description: oldDescription,
        },
      } : null)
      toast.error('Failed to update description')
    }
  }

  const handleUpdatePriority = async (priority: Priority) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldPriority = ticketDetails.ticket.priority

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        priority,
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { priority },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            priority: oldPriority,
          },
        } : null)
        toast.error('Failed to update priority')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          priority: oldPriority,
        },
      } : null)
      toast.error('Failed to update priority')
    }
  }

  const handleUpdateTags = async (tags: string[]) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldTags = ticketDetails.ticket.tags || []

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        tags: Array.isArray(tags) ? tags : [],
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { tags: Array.isArray(tags) ? tags : [] },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            tags: oldTags,
          },
        } : null)
        toast.error('Failed to update tags')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          tags: oldTags,
        },
      } : null)
      toast.error('Failed to update tags')
    }
  }

  const handleUpdateAssignee = async (assigneeId: string | null) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldAssigneeId = ticketDetails.ticket.assigneeId

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        assigneeId: assigneeId || undefined,
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { assigneeId: assigneeId || null },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            assigneeId: oldAssigneeId,
          },
        } : null)
        toast.error('Failed to update assignee')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          assigneeId: oldAssigneeId,
        },
      } : null)
      toast.error('Failed to update assignee')
    }
  }

  const handleUpdateDueDate = async (date: Date | null) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldDueDate = ticketDetails.ticket.dueDate

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        dueDate: date ? date.toISOString() : undefined,
      },
    } : null)
    setDatePickerOpen(null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { dueDate: date ? date.toISOString() : null },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            dueDate: oldDueDate,
          },
        } : null)
        toast.error('Failed to update due date')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          dueDate: oldDueDate,
        },
      } : null)
      toast.error('Failed to update due date')
    }
  }

  const handleUpdateStartDate = async (date: Date | null) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldStartDate = ticketDetails.ticket.startDate

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        startDate: date ? date.toISOString() : undefined,
      },
    } : null)
    setDatePickerOpen(null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { startDate: date ? date.toISOString() : null },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            startDate: oldStartDate,
          },
        } : null)
        toast.error('Failed to update start date')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          startDate: oldStartDate,
        },
      } : null)
      toast.error('Failed to update start date')
    }
  }

  // Epic management functions
  const loadEpics = () => {
    if (boardId && availableEpics.length === 0) {
      setLoadingEpics(true)
      axiosInstance
        .get<{ success: boolean; data: Ticket[] }>(GET_TICKETS_BY_BOARD(boardId))
        .then((response) => {
          if (response.data.success && response.data.data) {
            const epics = response.data.data.filter((ticket) => ticket.ticketType === 'epic')
            setAvailableEpics(epics)
          }
        })
        .catch((error) => {
          console.error('Error fetching epics:', error)
        })
        .finally(() => {
          setLoadingEpics(false)
        })
    }
  }

  const handleSelectEpic = async (epicId: string) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    setUpdatingEpic(true)
    
    // Store old value for revert
    const oldEpicId = ticketDetails.ticket.rootEpicId
    
    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        rootEpicId: epicId,
      },
    } : null)

    // Fetch epic ticket immediately
    try {
      const epicResponse = await axiosInstance.get<{ success: boolean; data: TicketDetailResponse }>(
        GET_TICKET_BY_ID(epicId)
      )
      if (epicResponse.data.success && epicResponse.data.data) {
        setEpicTicket(epicResponse.data.data.ticket)
      }
    } catch (error) {
      console.error('Error fetching epic ticket:', error)
    }
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: {
            rootEpicId: epicId,
          },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            rootEpicId: oldEpicId,
          },
        } : null)
        setEpicTicket(null)
        toast.error('Failed to update epic')
      } else {
        // Update parent component's task state using optimistic update
        // Trust the local state - no need to refetch
        if (ticketDetails) {
          const updatedTask = ticketToTask(
            { ...ticketDetails.ticket, rootEpicId: epicId },
            columns,
            users,
            task
          )
          onUpdate(updatedTask)
        }
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          rootEpicId: oldEpicId,
        },
      } : null)
      toast.error('Failed to update epic')
    } finally {
      setUpdatingEpic(false)
    }
  }

  // Parent management functions
  // parentTicketId rules:
  // - For task/bug/story: parentTicketId MUST be an epic
  // - For subtask: parentTicketId can be task/bug/story/epic
  const handleUpdateParent = async (parentTicketId: string | null) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return
    
    const ticketType = ticketDetails.ticket.ticketType
    
    // Only allow parent updates for task/bug/story/subtask
    if (ticketType !== 'task' && ticketType !== 'bug' && ticketType !== 'story' && ticketType !== 'subtask') {
      toast.error('This ticket type cannot have a parent')
      return
    }
    
    // Validate parent type
    if (parentTicketId) {
      const parentTicket = availableTickets.find(t => t.id === parentTicketId)
      if (!parentTicket) {
        toast.error('Parent ticket not found')
        return
      }
      
      // For task/bug/story: parent can be epic OR bug
      if (ticketType === 'task' || ticketType === 'bug' || ticketType === 'story') {
        if (parentTicket.ticketType !== 'epic' && parentTicket.ticketType !== 'bug') {
          toast.error('Task, bug, and story tickets must have an epic or bug as parent')
          return
        }
      }
      
      // For subtask: parent cannot be a subtask
      if (ticketType === 'subtask' && parentTicket.ticketType === 'subtask') {
        toast.error('Subtasks cannot have subtasks as parents')
        return
      }
    }

    const oldParentTicketId = ticketDetails.ticket.parentTicketId

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        parentTicketId: parentTicketId || undefined,
      },
      relatedTickets: {
        ...prev.relatedTickets,
        parent: parentTicketId 
          ? (availableTickets.find((t) => t.id === parentTicketId) as Ticket | undefined) || null
          : null,
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { parentTicketId: parentTicketId || null },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            parentTicketId: oldParentTicketId,
          },
          relatedTickets: {
            ...prev.relatedTickets,
            parent: oldParentTicketId 
              ? (availableTickets.find((t) => t.id === oldParentTicketId) as Ticket | undefined) || null
              : null,
          },
        } : null)
        toast.error('Failed to update parent ticket')
      } else {
        // Update parent component's task state using optimistic update
        // Trust the local state - no need to refetch
        if (ticketDetails) {
          const updatedTask = ticketToTask(
            { ...ticketDetails.ticket, parentTicketId: parentTicketId || undefined },
            columns,
            users,
            task
          )
          onUpdate(updatedTask)
        }
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          parentTicketId: oldParentTicketId,
        },
        relatedTickets: {
          ...prev.relatedTickets,
          parent: oldParentTicketId 
            ? (availableTickets.find((t) => t.id === oldParentTicketId) as Ticket | undefined) || null
            : null,
        },
      } : null)
      toast.error('Failed to update parent ticket')
    }
  }

  const getAvailableParents = () => {
    if (!availableTickets.length) return []
    
    // parentTicketId rules:
    // - For task/bug/story: parentTicketId can be epic OR bug
    // - For subtask: parentTicketId can be task/bug/story/epic (NOT subtask)
    if (editedTask.type === 'task' || editedTask.type === 'bug' || editedTask.type === 'story') {
      // Task/Bug/Story: parent can be epic OR bug
      return availableTickets.filter(
        (t) => t.id !== editedTask.id && 
        (t.ticketType === 'epic' || t.ticketType === 'bug')
      ).map(t => ({
        id: t.id,
        ticketKey: t.ticketKey,
        title: t.title,
        ticketType: t.ticketType,
      }))
    } else if (editedTask.type === 'subtask') {
      // Subtask: parent can be task/bug/story/epic (NOT subtask)
      return availableTickets.filter(
        (t) => t.id !== editedTask.id && 
        t.ticketType !== 'subtask' && // Subtasks cannot be parents
        (t.ticketType === 'epic' || t.ticketType === 'story' || t.ticketType === 'task' || t.ticketType === 'bug')
      ).map(t => ({
        id: t.id,
        ticketKey: t.ticketKey,
        title: t.title,
        ticketType: t.ticketType,
      }))
    }
    
    // Epics cannot have parentTicketId
    return []
  }

  const handleUpdateEndDate = async (date: Date | null) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldEndDate = ticketDetails.ticket.endDate

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        endDate: date ? date.toISOString() : undefined,
      },
    } : null)
    setDatePickerOpen(null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { endDate: date ? date.toISOString() : null },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            endDate: oldEndDate,
          },
        } : null)
        toast.error('Failed to update end date')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          endDate: oldEndDate,
        },
      } : null)
      toast.error('Failed to update end date')
    }
  }

  // Wrapper for date updates to maintain compatibility with TaskDetailFields
  const handleUpdateDate = async (field: 'dueDate' | 'startDate' | 'endDate', date: Date | null) => {
    if (!canUpdateTicket) return
    if (field === 'dueDate') {
      await handleUpdateDueDate(date)
    } else if (field === 'startDate') {
      await handleUpdateStartDate(date)
    } else if (field === 'endDate') {
      await handleUpdateEndDate(date)
    }
  }

  const handleAddTag = () => {
    if (!canUpdateTicket) return
    if (!newTag.trim()) return
    const updatedTags = [...(ticketDetails?.ticket.tags || []), newTag.trim()]
    handleUpdateTags(updatedTags)
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (!canUpdateTicket) return
    const updatedTags = (ticketDetails?.ticket.tags || []).filter((tag) => tag !== tagToRemove)
    handleUpdateTags(updatedTags)
  }

  const handleAddBranch = async () => {
    if (!newBranchName.trim() || !ticketDetails?.ticket.id || !canUpdateTicket) return
    
    const branchNameToAdd = newBranchName.trim()
    const oldGithub = ticketDetails.ticket.github
    
    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        github: {
          branchName: branchNameToAdd,
          status: 'open',
          pullRequestUrl: oldGithub?.pullRequestUrl,
        },
      },
    } : null)
    setNewBranchName('')
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: {
            github: {
              branchName: branchNameToAdd,
              status: 'open',
            },
          },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            github: oldGithub,
          },
        } : null)
        setNewBranchName(branchNameToAdd)
        toast.error('Failed to add branch')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          github: oldGithub,
        },
      } : null)
      setNewBranchName(branchNameToAdd)
      toast.error('Failed to add branch')
    }
  }

  const handleUpdateBranchStatus = async (branchName: string, status: 'merged' | 'open' | 'closed') => {
    if (!ticketDetails?.ticket.id || !canUpdateTicket) return
    
    const oldGithub = ticketDetails.ticket.github
    
    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        github: {
          branchName,
          status,
          pullRequestUrl: oldGithub?.pullRequestUrl,
        },
      },
    } : null)
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: {
            github: {
              branchName,
              status,
              pullRequestUrl: oldGithub?.pullRequestUrl,
            },
          },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            github: oldGithub,
          },
        } : null)
        toast.error('Failed to update branch status')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          github: oldGithub,
        },
      } : null)
      toast.error('Failed to update branch status')
    }
  }

  const handleUpdatePullRequestUrl = async (branchName: string, pullRequestUrl: string) => {
    if (!ticketDetails?.ticket.id || !canUpdateTicket) return
    
    const oldGithub = ticketDetails.ticket.github
    
    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        github: {
          branchName,
          status: oldGithub?.status || 'open',
          pullRequestUrl,
        },
      },
    } : null)
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: {
            github: {
              branchName,
              status: oldGithub?.status || 'open',
              pullRequestUrl,
            },
          },
        }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            github: oldGithub,
          },
        } : null)
        toast.error('Failed to update pull request URL')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          github: oldGithub,
        },
      } : null)
      toast.error('Failed to update pull request URL')
    }
  }


  const handleUpdateField = <K extends keyof Task>(field: K, value: Task[K]) => {
    if (!canUpdateTicket) return
    const updated = { ...editedTask, [field]: value, updatedAt: new Date() }
    onUpdate(updated)
    
    if (field === 'assignee' && ticketDetails?.ticket.id) {
      const assignee = value as Assignee | undefined
      handleUpdateAssignee(assignee?.id || null)
      if (onUpdateAssignee) {
        onUpdateAssignee(task.id, assignee)
      }
    } else if (field === 'description' && ticketDetails?.ticket.id) {
      const description = value as string | undefined
      handleUpdateDescription(description || '')
    }
  }

  const handleAddComment = async () => {
    if (!canComment) return
    if (!newComment.trim() || !ticketDetails?.ticket.id) return

    const commentContent = {
      type: 'html',
      content: newComment,
    }

    const commentText = newComment
    setNewComment('')

    try {
      const response = await axiosInstance.post<{ success: boolean; data: any }>(
        CREATE_COMMENT(ticketDetails.ticket.id),
        { content: commentContent }
      )

      if (!response.data.success) {
        setNewComment(commentText)
        toast.error('Failed to add comment')
      } else {
        // Optimistically update ticketDetails with new comment
        if (ticketDetails) {
          const newCommentData = {
            id: `comment-${Date.now()}`,
            ticketId: ticketDetails.ticket.id,
            userId: user?.id || '',
            content: commentContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setTicketDetails({
            ...ticketDetails,
            comments: [...(ticketDetails.comments || []), newCommentData],
          })
        }
      }
    } catch (error) {
      setNewComment(commentText)
      toast.error('Failed to add comment')
    }
  }

  const handleAddRelatedTicket = async (relatedTicketId: string) => {
    if (!canRelateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldRelatedTickets = (ticketDetails.ticket.relatedTickets || []) as string[]
    const newRelatedTickets = [...oldRelatedTickets, relatedTicketId]
    const relatedTicket = availableTickets.find((t) => t.id === relatedTicketId)

    // Optimistic update
    setTicketDetails((prev) => {
      if (!prev) return null
      const currentManualRelated = prev.relatedTickets.manualRelated || []
      return {
        ...prev,
        ticket: {
          ...prev.ticket,
          relatedTickets: newRelatedTickets,
        },
        relatedTickets: {
          ...prev.relatedTickets,
          manualRelated: relatedTicket ? [...currentManualRelated, relatedTicket] : currentManualRelated,
        },
      }
    })

    try {
      const response = await axiosInstance.post<{ success: boolean; data: Ticket }>(
        ADD_RELATED_TICKET(ticketDetails.ticket.id),
        { relatedTicketId }
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => {
          if (!prev) return null
          return {
            ...prev,
            ticket: {
              ...prev.ticket,
              relatedTickets: oldRelatedTickets,
            },
            relatedTickets: {
              ...prev.relatedTickets,
              manualRelated: (prev.relatedTickets.manualRelated || []).filter((t: Ticket) => t.id !== relatedTicketId),
            },
          }
        })
        toast.error('Failed to add related ticket')
      } else {
        // Refresh ticket details to get updated related tickets
        await fetchTicketDetails()
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => {
        if (!prev) return null
        return {
          ...prev,
          ticket: {
            ...prev.ticket,
            relatedTickets: oldRelatedTickets,
          },
          relatedTickets: {
            ...prev.relatedTickets,
            manualRelated: (prev.relatedTickets.manualRelated || []).filter((t: Ticket) => t.id !== relatedTicketId),
          },
        }
      })
      toast.error('Failed to add related ticket')
    }
  }

  const handleRemoveRelatedTicket = async (relatedTicketId: string) => {
    if (!canRelateTicket) return
    if (!ticketDetails?.ticket.id) return

    const oldRelatedTickets = (ticketDetails.ticket.relatedTickets || []) as string[]
    const oldManualRelated = ticketDetails.relatedTickets.manualRelated || []
    const newRelatedTickets = oldRelatedTickets.filter((id: string) => id !== relatedTicketId)
    const removedTicket = oldManualRelated.find((t: Ticket) => t.id === relatedTicketId)

    // Optimistic update
    setTicketDetails((prev) => {
      if (!prev) return null
      return {
        ...prev,
        ticket: {
          ...prev.ticket,
          relatedTickets: newRelatedTickets,
        },
        relatedTickets: {
          ...prev.relatedTickets,
          manualRelated: (prev.relatedTickets.manualRelated || []).filter((t: Ticket) => t.id !== relatedTicketId),
        },
      }
    })

    try {
      const response = await axiosInstance.delete<{ success: boolean; data: Ticket }>(
        REMOVE_RELATED_TICKET(ticketDetails.ticket.id, relatedTicketId)
      )

      if (!response.data.success) {
        // Revert on error
        setTicketDetails((prev) => {
          if (!prev) return null
          return {
            ...prev,
            ticket: {
              ...prev.ticket,
              relatedTickets: oldRelatedTickets,
            },
            relatedTickets: {
              ...prev.relatedTickets,
              manualRelated: removedTicket ? [...(prev.relatedTickets.manualRelated || []), removedTicket] : prev.relatedTickets.manualRelated,
            },
          }
        })
        toast.error('Failed to remove related ticket')
      }
    } catch (error) {
      // Revert on error
      setTicketDetails((prev) => {
        if (!prev) return null
        return {
          ...prev,
          ticket: {
            ...prev.ticket,
            relatedTickets: oldRelatedTickets,
          },
          relatedTickets: {
            ...prev.relatedTickets,
            manualRelated: removedTicket ? [...(prev.relatedTickets.manualRelated || []), removedTicket] : prev.relatedTickets.manualRelated,
          },
        }
      })
      toast.error('Failed to remove related ticket')
    }
  }

  const handleUpdateStatus = async (columnId: string) => {
    if (!canUpdateTicket) return
    if (!ticketDetails?.ticket.id) return
    
    const oldColumnId = ticketDetails.ticket.columnId
    // Track pending update to prevent refetching stale data
    pendingUpdateRef.current = { columnId, timestamp: Date.now() }
    
    // Optimistic update - update ticketDetails first
    const updatedTicketDetails: TicketDetailResponse = {
      ...ticketDetails,
      ticket: {
        ...ticketDetails.ticket,
        columnId,
      },
    }
    setTicketDetails(updatedTicketDetails)
    
    // Compute updated task from the new ticketDetails
    const updatedTask = ticketToTask(updatedTicketDetails.ticket, columns, users, editedTask)
    onUpdate(updatedTask)
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          data: { columnId },
        }
      )
      
      if (!response.data.success) {
        // Revert on error
        pendingUpdateRef.current = null
        setTicketDetails((prev) => prev ? {
          ...prev,
          ticket: {
            ...prev.ticket,
            columnId: oldColumnId,
          },
        } : null)
        const revertedTask = ticketToTask(
          { ...ticketDetails.ticket, columnId: oldColumnId },
          columns,
          users,
          editedTask
        )
        onUpdate(revertedTask)
        toast.error('Failed to update status')
      } else {
        // Update with server response to ensure consistency
        if (response.data.data) {
          const serverTicketDetails: TicketDetailResponse = {
            ...ticketDetails,
            ticket: response.data.data,
          }
          setTicketDetails(serverTicketDetails)
          // Clear pending update after successful server response
          pendingUpdateRef.current = null
        }
      }
    } catch (error) {
      // Revert on error
      pendingUpdateRef.current = null
      setTicketDetails((prev) => prev ? {
        ...prev,
        ticket: {
          ...prev.ticket,
          columnId: oldColumnId,
        },
      } : null)
      const revertedTask = ticketToTask(
        { ...ticketDetails.ticket, columnId: oldColumnId },
        columns,
        users,
        editedTask
      )
      onUpdate(revertedTask)
      toast.error('Failed to update status')
    }
  }

  const handleShareTicket = async () => {
    const ticketUrl = `${window.location.origin}/workspace/${boardKey}/${editedTask.key}`
    try {
      await navigator.clipboard.writeText(ticketUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleFullscreen = () => {
    navigate(`/workspace/${boardKey}/${editedTask.key}`)
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const url = new URL(window.location.href)
      url.searchParams.set('selectedTask', task.key)
      window.history.replaceState({}, '', url.toString())
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, task.key])

  const handleClose = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('selectedTask')
    window.history.replaceState({}, '', url.toString())
    onClose()
  }

  // Find current column by matching ticket's columnId with column id
  // Fallback to matching by column name (task.status) if ticketDetails is not loaded yet
  const currentColumn = ticketDetails?.ticket.columnId
    ? columns.find((col) => col.id === ticketDetails.ticket.columnId)
    : columns.find((col) => col.name === task.status)
  const subtasksDone = editedTask.subtasks.filter((s) => s.status === 'done').length
  const subtasksProgress = editedTask.subtasks.length > 0 
    ? Math.round((subtasksDone / editedTask.subtasks.length) * 100) 
    : 0

  if (!open) return null

  if (fullPage) {
    return (
      <div className="h-full w-full flex flex-col bg-background">
        <div className="bg-background border-b border-border/50 w-full overflow-hidden flex flex-col flex-1">
          <TaskDetailHeader
            editedTask={editedTask}
            epicTicket={epicTicket}
            ticketDetails={ticketDetails}
            viewers={viewers}
            linkCopied={linkCopied}
            fullPage={fullPage}
            availableEpics={availableEpics}
            loadingEpics={loadingEpics}
            updatingEpic={updatingEpic}
            boardKey={boardKey}
            isEpic={ticketDetails?.ticket.ticketType === 'epic'}
            onNavigateToTask={onNavigateToTask}
            onClose={handleClose}
            onBackToBoard={fullPage ? handleClose : undefined}
            onShare={handleShareTicket}
            onFullscreen={handleFullscreen}
            onLoadEpics={loadEpics}
            onSelectEpic={handleSelectEpic}
          />

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {loading && !ticketDetails ? (
                // Skeleton loading state for fullPage
                <>
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <TaskTitleSection
                    editedTask={editedTask}
                    ticketDetails={ticketDetails}
                    descriptionExpanded={descriptionExpanded}
                    isEditingDescription={isEditingDescription}
                    onToggleDescription={() => setDescriptionExpanded(!descriptionExpanded)}
                    onStartEditingDescription={() => setIsEditingDescription(true)}
                    onUpdateDescription={(description: string | Record<string, any>) => {
                      handleUpdateDescription(typeof description === 'string' ? description : JSON.stringify(description))
                      setIsEditingDescription(false)
                    }}
                    onCancelEditingDescription={() => {
                      setIsEditingDescription(false)
                      // Revert to original description
                      if (ticketDetails) {
                        setTicketDetails({
                          ...ticketDetails,
                          ticket: {
                            ...ticketDetails.ticket,
                            description: ticketDetails.ticket.description || {},
                          },
                        })
                      }
                    }}
                    onDescriptionChange={(value: string | Record<string, any>) => {
                      // Update local state for editing - RichTextEditor returns RichTextDoc object
                      setTicketDetails((prev) => prev ? {
                        ...prev,
                        ticket: {
                          ...prev.ticket,
                          description: typeof value === 'string' ? (value ? JSON.parse(value) : {}) : (value || {}),
                        },
                      } : null)
                    }}
                  />

                  <AcceptanceCriteriaSection
                    ticketDetails={ticketDetails}
                    acceptanceCriteriaExpanded={acceptanceCriteriaExpanded}
                    onToggleAcceptanceCriteria={() => setAcceptanceCriteriaExpanded(!acceptanceCriteriaExpanded)}
                    canUpdate={canUpdateTicket}
                  />

                  <DocumentsSection
                    ticketDetails={ticketDetails}
                    documentsExpanded={documentsExpanded}
                    onToggleDocuments={() => setDocumentsExpanded(!documentsExpanded)}
                    canUpdate={canUpdateTicket}
                  />

                  <TaskRelatedTicketsSection
                    relatedTickets={ticketDetails?.relatedTickets || null}
                    ticketDetails={ticketDetails}
                    availableTickets={availableTickets}
                    onNavigateToTask={onNavigateToTask}
                    onAddRelatedTicket={handleAddRelatedTicket}
                    onRemoveRelatedTicket={handleRemoveRelatedTicket}
                  />

                  <TaskSubtasksSection
                    editedTask={editedTask}
                    subtasksExpanded={subtasksExpanded}
                    subtasksProgress={subtasksProgress}
                    ticketDetails={ticketDetails}
                    boardId={boardId}
                    columns={columns}
                    onToggleSubtasks={() => setSubtasksExpanded(!subtasksExpanded)}
                    onNavigateToTask={onNavigateToTask}
                    onRefreshTicket={fetchTicketDetails}
                    canCreateSubtask={canCreateTicket}
                  />

                  <TaskActivitySection
                    ticketDetails={ticketDetails}
                    loading={loading}
                    activityTab={activityTab}
                    newComment={newComment}
                    onTabChange={setActivityTab}
                    onCommentChange={setNewComment}
                    onAddComment={handleAddComment}
                    canComment={canComment}
                  />
                </>
              )}
            </div>

            <TaskSidebar
              {...{
                editedTask,
                ticketDetails,
                columns,
                currentColumn,
                users,
                detailsSettings,
                newTag,
                setNewTag,
                datePickerOpen,
                setDatePickerOpen,
                githubBranches,
                newBranchName,
                setNewBranchName,
                availableTicketsForParent: availableTickets.map(t => ({
                  id: t.id,
                  ticketKey: t.ticketKey,
                  title: t.title,
                  ticketType: t.ticketType,
                })),
                onStatusChange: handleUpdateStatus,
                onUpdatePriority: handleUpdatePriority,
                onUpdateField: handleUpdateField as any,
                onUpdateDate: handleUpdateDate,
                onAddTag: handleAddTag,
                onRemoveTag: handleRemoveTag,
                onUpdateParent: handleUpdateParent,
                getAvailableParents,
                onNavigateToTask,
                onAddBranch: handleAddBranch,
                onUpdateBranchStatus: handleUpdateBranchStatus,
                onUpdatePullRequestUrl: handleUpdatePullRequestUrl,
              } as any}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="fixed inset-4 sm:inset-8 z-50 flex items-start justify-center overflow-hidden">
        <div
          className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-6xl max-h-full overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <TaskDetailHeader
            editedTask={editedTask}
            epicTicket={epicTicket}
            ticketDetails={ticketDetails}
            viewers={viewers}
            linkCopied={linkCopied}
            fullPage={fullPage}
            availableEpics={availableEpics}
            loadingEpics={loadingEpics}
            updatingEpic={updatingEpic}
            boardKey={boardKey}
            isEpic={ticketDetails?.ticket.ticketType === 'epic'}
            onNavigateToTask={onNavigateToTask}
            onClose={handleClose}
            onBackToBoard={fullPage ? handleClose : undefined}
            onShare={handleShareTicket}
            onFullscreen={handleFullscreen}
            onLoadEpics={loadEpics}
            onSelectEpic={handleSelectEpic}
          />

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {loading && !ticketDetails ? (
                // Skeleton loading state for modal
                <>
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <TaskTitleSection
                editedTask={editedTask}
                ticketDetails={ticketDetails}
                descriptionExpanded={descriptionExpanded}
                isEditingDescription={isEditingDescription}
                onToggleDescription={() => setDescriptionExpanded(!descriptionExpanded)}
                onStartEditingDescription={() => setIsEditingDescription(true)}
                onUpdateDescription={(description: string | Record<string, any>) => {
                  handleUpdateDescription(typeof description === 'string' ? description : JSON.stringify(description))
                  setIsEditingDescription(false)
                }}
                onCancelEditingDescription={() => {
                  setIsEditingDescription(false)
                  // Revert to original description
                  if (ticketDetails) {
                    setTicketDetails({
                      ...ticketDetails,
                      ticket: {
                        ...ticketDetails.ticket,
                        description: ticketDetails.ticket.description || {},
                      },
                    })
                  }
                }}
                onDescriptionChange={(value: string | Record<string, any>) => {
                  // Update local state for editing - RichTextEditor returns RichTextDoc object
                  setTicketDetails((prev) => prev ? {
                    ...prev,
                    ticket: {
                      ...prev.ticket,
                      description: typeof value === 'string' ? (value ? JSON.parse(value) : {}) : (value || {}),
                    },
                  } : null)
                }}
              />

              <AcceptanceCriteriaSection
                ticketDetails={ticketDetails}
                acceptanceCriteriaExpanded={acceptanceCriteriaExpanded}
                onToggleAcceptanceCriteria={() => setAcceptanceCriteriaExpanded(!acceptanceCriteriaExpanded)}
                canUpdate={canUpdateTicket}
              />

              <DocumentsSection
                ticketDetails={ticketDetails}
                documentsExpanded={documentsExpanded}
                onToggleDocuments={() => setDocumentsExpanded(!documentsExpanded)}
                canUpdate={canUpdateTicket}
              />

              <TaskRelatedTicketsSection
                relatedTickets={ticketDetails?.relatedTickets || null}
                ticketDetails={ticketDetails}
                availableTickets={availableTickets}
                onNavigateToTask={onNavigateToTask}
                onAddRelatedTicket={handleAddRelatedTicket}
                onRemoveRelatedTicket={handleRemoveRelatedTicket}
              />

              <TaskSubtasksSection
                editedTask={editedTask}
                subtasksExpanded={subtasksExpanded}
                subtasksProgress={subtasksProgress}
                ticketDetails={ticketDetails}
                boardId={boardId}
                columns={columns}
                onToggleSubtasks={() => setSubtasksExpanded(!subtasksExpanded)}
                onNavigateToTask={onNavigateToTask}
                onRefreshTicket={fetchTicketDetails}
                canCreateSubtask={canCreateTicket}
              />

              <TaskActivitySection
                ticketDetails={ticketDetails}
                loading={loading}
                activityTab={activityTab}
                newComment={newComment}
                onTabChange={setActivityTab}
                onCommentChange={setNewComment}
                onAddComment={handleAddComment}
                canComment={canComment}
              />
                </>
              )}
            </div>

            <TaskSidebar
              {...{
                editedTask,
                ticketDetails,
                columns,
                currentColumn,
                users,
                detailsSettings,
                newTag,
                setNewTag,
                datePickerOpen,
                setDatePickerOpen,
                githubBranches,
                newBranchName,
                setNewBranchName,
                availableTicketsForParent: availableTickets.map(t => ({
                  id: t.id,
                  ticketKey: t.ticketKey,
                  title: t.title,
                  ticketType: t.ticketType,
                })),
                onStatusChange: handleUpdateStatus,
                onUpdatePriority: handleUpdatePriority,
                onUpdateField: handleUpdateField as any,
                onUpdateDate: handleUpdateDate,
                onAddTag: handleAddTag,
                onRemoveTag: handleRemoveTag,
                onUpdateParent: handleUpdateParent,
                getAvailableParents,
                onNavigateToTask,
                onAddBranch: handleAddBranch,
                onUpdateBranchStatus: handleUpdateBranchStatus,
                onUpdatePullRequestUrl: handleUpdatePullRequestUrl,
              } as any}
            />
          </div>
        </div>
      </div>
    </>
  )
}
