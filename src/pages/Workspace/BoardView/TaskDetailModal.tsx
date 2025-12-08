import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/utils/axios.instance'
import { GET_TICKET_BY_ID, GET_TICKETS_BY_BOARD, UPDATE_TICKET, GET_TICKET_DETAILS_SETTINGS, GET_USERS, CREATE_COMMENT } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
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
import { toastManager } from '@/components/ui/toast'

type TaskDetailModalProps = {
  open: boolean
  onClose: () => void
  task: Task
  columns: Column[]
  onUpdate: (task: Task) => void
  onUpdateAssignee?: (taskId: string, assignee: Assignee | undefined) => Promise<void>
  boardKey: string
  boardId?: string
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

  return {
    ...originalTask,
    id: ticket.id,
    key: ticket.ticketKey,
    title: ticket.title,
    description: typeof ticket.description === 'string' ? ticket.description : originalTask.description,
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
  const [viewers, setViewers] = useState<Assignee[]>([])
  const [availableTicketsForParent, setAvailableTicketsForParent] = useState<Ticket[]>([])
  const [githubBranches, setGithubBranches] = useState<Array<{ name: string; status: 'merged' | 'open' | 'closed'; pullRequestUrl?: string }>>([])
  const [detailsSettings, setDetailsSettings] = useState<{
    fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }>
  } | null>(null)
  
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Fetch ticket details - single source of truth
  const refreshTicketDetails = async () => {
    if (!task.id) return
    setLoading(true)
    try {
      const response = await axiosInstance.get<{ success: boolean; data: TicketDetailResponse }>(
        GET_TICKET_BY_ID(task.id)
      )
      if (response.data.success && response.data.data) {
        setTicketDetails(response.data.data)
        
        // Fetch epic ticket if rootEpicId exists
        if (response.data.data.ticket.rootEpicId) {
          try {
            const epicResponse = await axiosInstance.get<{ success: boolean; data: TicketDetailResponse }>(
              GET_TICKET_BY_ID(response.data.data.ticket.rootEpicId)
            )
            if (epicResponse.data.success && epicResponse.data.data) {
              setEpicTicket(epicResponse.data.data.ticket)
            }
          } catch (error) {
            console.error('Error fetching epic ticket:', error)
            setEpicTicket(null)
          }
        } else {
          setEpicTicket(null)
        }
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch ticket details when modal opens
  useEffect(() => {
    if (open && task.id) {
      refreshTicketDetails()
    }
  }, [open, task.id])

  // Fetch users
  useEffect(() => {
    if (open) {
      axiosInstance
        .get<{ status: string; data: Array<{ id: string; name: string; profilePic?: string }> }>(GET_USERS())
        .then((response) => {
          if (response.data.data) {
            setUsers(response.data.data)
          }
        })
        .catch((error) => {
          console.error('Error fetching users:', error)
        })
    }
  }, [open])

  // Fetch details settings
  useEffect(() => {
    if (open && boardId && user) {
      axiosInstance
        .get<{ success: boolean; data: { fieldConfigs: Array<{ fieldName: string; isVisible: boolean; order: number }> } }>(
          GET_TICKET_DETAILS_SETTINGS(boardId)
        )
        .then((response) => {
          if (response.data.success && response.data.data) {
            setDetailsSettings(response.data.data)
          }
        })
        .catch((error) => {
          console.error('Error fetching details settings:', error)
        })
    }
  }, [open, boardId, user])

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

    const viewersList: Assignee[] = []
    viewedBy.forEach((viewer: { userId: string; viewedAt: string }) => {
      const userData = users.find((u) => u.id === viewer.userId)
      if (userData) {
        const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        viewersList.push({
          id: userData.id,
          name: userData.name,
          initials,
          color: 'bg-cyan-500',
          avatar: userData.profilePic,
        })
      }
    })
    
    const sorted = [...viewersList].sort((a, b) => {
      const aViewer = viewedBy.find((v: { userId: string; viewedAt: string }) => v.userId === a.id)
      const bViewer = viewedBy.find((v: { userId: string; viewedAt: string }) => v.userId === b.id)
      if (!aViewer || !bViewer) return 0
      return new Date(bViewer.viewedAt).getTime() - new Date(aViewer.viewedAt).getTime()
    })
    
    setViewers(sorted)
  }, [ticketDetails?.ticket, users])

  // Fetch available tickets for parent selection
  useEffect(() => {
    if (open && boardId) {
      axiosInstance
        .get<{ success: boolean; data: Ticket[] }>(GET_TICKETS_BY_BOARD(boardId))
        .then((response) => {
          if (response.data.success && response.data.data) {
            setAvailableTicketsForParent(response.data.data)
          }
        })
        .catch((error) => {
          console.error('Error fetching tickets for parent:', error)
        })
    }
  }, [open, boardId])

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

  // Get available parent tickets
  const getAvailableParents = () => {
    if (!availableTicketsForParent.length) return []
    
    if (editedTask.type === 'subtask') {
      return availableTicketsForParent.filter(
        (t) => t.id !== editedTask.id && 
        (t.ticketType === 'epic' || t.ticketType === 'story' || t.ticketType === 'task' || t.ticketType === 'bug')
      )
    }
    
    if (editedTask.type === 'task' || editedTask.type === 'bug') {
      return availableTicketsForParent.filter(
        (t) => t.id !== editedTask.id && t.ticketType !== 'subtask'
      )
    }
    
    return availableTicketsForParent.filter(
      (t) => t.id !== editedTask.id && t.ticketType !== 'subtask'
    )
  }

  // Update handlers - all update ticketDetails directly, then refresh from backend
  const updateTicketField = async (field: string, value: any) => {
    if (!ticketDetails?.ticket.id) return

    // Optimistic update
    setTicketDetails((prev) => prev ? {
      ...prev,
      ticket: {
        ...prev.ticket,
        [field]: value,
      },
    } : null)

    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          timestamp: new Date().toISOString(),
          data: { [field]: value },
        }
      )

      if (!response.data.success) {
        // Revert on error
        await refreshTicketDetails()
        toastManager.error(`Failed to update ${field}`)
      } else {
        // Refresh to get latest from backend
        await refreshTicketDetails()
      }
    } catch (error) {
      // Revert on error
      await refreshTicketDetails()
      toastManager.error(`Failed to update ${field}`)
    }
  }

  const handleUpdatePriority = async (priority: Priority) => {
    await updateTicketField('priority', priority)
  }

  const handleUpdateTags = async (tags: string[]) => {
    await updateTicketField('tags', tags)
  }

  const handleUpdateParent = async (parentTicketId: string | null) => {
    await updateTicketField('parentTicketId', parentTicketId)
  }

  const handleUpdateDate = async (field: 'dueDate' | 'startDate' | 'endDate', date: Date | null) => {
    setDatePickerOpen(null)
    await updateTicketField(field, date ? date.toISOString() : null)
  }

  const handleAddTag = () => {
    if (!newTag.trim()) return
    const updatedTags = [...(ticketDetails?.ticket.tags || []), newTag.trim()]
    handleUpdateTags(updatedTags)
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = (ticketDetails?.ticket.tags || []).filter((tag) => tag !== tagToRemove)
    handleUpdateTags(updatedTags)
  }

  const handleAddBranch = async () => {
    if (!newBranchName.trim() || !ticketDetails?.ticket.id) return
    
    const branchNameToAdd = newBranchName.trim()
    setNewBranchName('')
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          timestamp: new Date().toISOString(),
          data: {
            github: {
              branchName: branchNameToAdd,
              status: 'open',
            },
          },
        }
      )

      if (!response.data.success) {
        toastManager.error('Failed to add branch')
      } else {
        await refreshTicketDetails()
      }
    } catch (error) {
      toastManager.error('Failed to add branch')
    }
  }

  const handleUpdateBranchStatus = async (branchName: string, status: 'merged' | 'open' | 'closed') => {
    if (!ticketDetails?.ticket.id) return
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          timestamp: new Date().toISOString(),
          data: {
            github: {
              branchName,
              status,
              pullRequestUrl: ticketDetails.ticket.github?.pullRequestUrl,
            },
          },
        }
      )

      if (!response.data.success) {
        toastManager.error('Failed to update branch status')
      } else {
        await refreshTicketDetails()
      }
    } catch (error) {
      toastManager.error('Failed to update branch status')
    }
  }

  const handleUpdatePullRequestUrl = async (branchName: string, pullRequestUrl: string) => {
    if (!ticketDetails?.ticket.id) return
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          timestamp: new Date().toISOString(),
          data: {
            github: {
              branchName,
              status: ticketDetails.ticket.github?.status || 'open',
              pullRequestUrl,
            },
          },
        }
      )

      if (!response.data.success) {
        toastManager.error('Failed to update pull request URL')
      } else {
        await refreshTicketDetails()
      }
    } catch (error) {
      toastManager.error('Failed to update pull request URL')
    }
  }

  // Fetch available epics
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
    if (!ticketDetails?.ticket.id) return

    setUpdatingEpic(true)
    
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
          timestamp: new Date().toISOString(),
          data: {
            rootEpicId: epicId,
          },
        }
      )

      if (!response.data.success) {
        await refreshTicketDetails()
        toastManager.error('Failed to update epic')
      } else {
        await refreshTicketDetails()
        onUpdate(editedTask)
      }
    } catch (error) {
      await refreshTicketDetails()
      toastManager.error('Failed to update epic')
    } finally {
      setUpdatingEpic(false)
    }
  }

  const handleUpdateField = <K extends keyof Task>(field: K, value: Task[K]) => {
    const updated = { ...editedTask, [field]: value, updatedAt: new Date() }
    onUpdate(updated)
    
    if (field === 'assignee' && ticketDetails?.ticket.id) {
      const assignee = value as Assignee | undefined
      updateTicketField('assigneeId', assignee?.id || null)
      if (onUpdateAssignee) {
        onUpdateAssignee(task.id, assignee)
      }
    } else if (field === 'description' && ticketDetails?.ticket.id) {
      const description = value as string | undefined
      updateTicketField('description', description || '')
    }
  }

  const handleAddComment = async () => {
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

      if (response.data.success) {
        await refreshTicketDetails()
      } else {
        setNewComment(commentText)
        toastManager.error('Failed to add comment')
      }
    } catch (error) {
      setNewComment(commentText)
      toastManager.error('Failed to add comment')
    }
  }

  const handleStatusChange = async (columnId: string) => {
    if (!ticketDetails?.ticket.id) return
    
    const column = columns.find((col) => col.id === columnId)
    const columnName = column?.name || columnId
    
    try {
      const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
        UPDATE_TICKET(ticketDetails.ticket.id),
        {
          timestamp: new Date().toISOString(),
          data: { columnId },
        }
      )
      
      if (!response.data.success) {
        toastManager.error('Failed to update status')
      } else {
        await refreshTicketDetails()
        const updatedTask = { ...editedTask, status: columnName }
        onUpdate(updatedTask)
      }
    } catch (error) {
      toastManager.error('Failed to update status')
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

  const currentColumn = columns.find((col) => col.id === editedTask.status)
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
              <TaskTitleSection
                editedTask={editedTask}
                descriptionExpanded={descriptionExpanded}
                isEditingDescription={isEditingDescription}
                onToggleDescription={() => setDescriptionExpanded(!descriptionExpanded)}
                onStartEditingDescription={() => setIsEditingDescription(true)}
                onUpdateDescription={(description: string) => {
                  handleUpdateField('description', description)
                  setIsEditingDescription(false)
                }}
                onCancelEditingDescription={() => {
                  setIsEditingDescription(false)
                }}
                onDescriptionChange={(value: string) => handleUpdateField('description', value)}
              />

              <AcceptanceCriteriaSection
                ticketDetails={ticketDetails}
                acceptanceCriteriaExpanded={acceptanceCriteriaExpanded}
                onToggleAcceptanceCriteria={() => setAcceptanceCriteriaExpanded(!acceptanceCriteriaExpanded)}
                onRefreshTicket={refreshTicketDetails}
              />

              <DocumentsSection
                ticketDetails={ticketDetails}
                documentsExpanded={documentsExpanded}
                onToggleDocuments={() => setDocumentsExpanded(!documentsExpanded)}
                onRefreshTicket={refreshTicketDetails}
              />

              <TaskRelatedTicketsSection
                relatedTickets={ticketDetails?.relatedTickets || null}
                onNavigateToTask={onNavigateToTask}
              />

              <TaskSubtasksSection
                editedTask={editedTask}
                subtasksExpanded={subtasksExpanded}
                subtasksProgress={subtasksProgress}
                ticketDetails={ticketDetails}
                boardId={boardId}
                columns={columns}
                onToggleSubtasks={() => setSubtasksExpanded(!subtasksExpanded)}
                onRefreshTicket={refreshTicketDetails}
                onNavigateToTask={onNavigateToTask}
              />

              <TaskActivitySection
                ticketDetails={ticketDetails}
                loading={loading}
                activityTab={activityTab}
                newComment={newComment}
                onTabChange={setActivityTab}
                onCommentChange={setNewComment}
                onAddComment={handleAddComment}
              />
            </div>

            <TaskSidebar
              {...{
                editedTask,
                columns,
                currentColumn,
                users,
                detailsSettings,
                setDetailsSettings,
                boardId,
                newTag,
                setNewTag,
                datePickerOpen,
                setDatePickerOpen,
                githubBranches,
                newBranchName,
                setNewBranchName,
                availableTicketsForParent,
                ticketDetailsParentKey: ticketDetails?.relatedTickets.parent?.ticketKey,
                onStatusChange: handleStatusChange,
                onUpdatePriority: handleUpdatePriority,
                onUpdateField: handleUpdateField as any,
                onUpdateDate: handleUpdateDate,
                onAddTag: handleAddTag,
                onRemoveTag: handleRemoveTag,
                onUpdateParent: handleUpdateParent,
                onAddBranch: handleAddBranch,
                onUpdateBranchStatus: handleUpdateBranchStatus,
                onUpdatePullRequestUrl: handleUpdatePullRequestUrl,
                getAvailableParents,
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
              <TaskTitleSection
                editedTask={editedTask}
                descriptionExpanded={descriptionExpanded}
                isEditingDescription={isEditingDescription}
                onToggleDescription={() => setDescriptionExpanded(!descriptionExpanded)}
                onStartEditingDescription={() => setIsEditingDescription(true)}
                onUpdateDescription={(description: string) => {
                  handleUpdateField('description', description)
                  setIsEditingDescription(false)
                }}
                onCancelEditingDescription={() => {
                  setIsEditingDescription(false)
                }}
                onDescriptionChange={(value: string) => handleUpdateField('description', value)}
              />

              <AcceptanceCriteriaSection
                ticketDetails={ticketDetails}
                acceptanceCriteriaExpanded={acceptanceCriteriaExpanded}
                onToggleAcceptanceCriteria={() => setAcceptanceCriteriaExpanded(!acceptanceCriteriaExpanded)}
                onRefreshTicket={refreshTicketDetails}
              />

              <DocumentsSection
                ticketDetails={ticketDetails}
                documentsExpanded={documentsExpanded}
                onToggleDocuments={() => setDocumentsExpanded(!documentsExpanded)}
                onRefreshTicket={refreshTicketDetails}
              />

              <TaskRelatedTicketsSection
                relatedTickets={ticketDetails?.relatedTickets || null}
                onNavigateToTask={onNavigateToTask}
              />

              <TaskSubtasksSection
                editedTask={editedTask}
                subtasksExpanded={subtasksExpanded}
                subtasksProgress={subtasksProgress}
                ticketDetails={ticketDetails}
                boardId={boardId}
                columns={columns}
                onToggleSubtasks={() => setSubtasksExpanded(!subtasksExpanded)}
                onRefreshTicket={refreshTicketDetails}
                onNavigateToTask={onNavigateToTask}
              />

              <TaskActivitySection
                ticketDetails={ticketDetails}
                loading={loading}
                activityTab={activityTab}
                newComment={newComment}
                onTabChange={setActivityTab}
                onCommentChange={setNewComment}
                onAddComment={handleAddComment}
              />
            </div>

            <TaskSidebar
              {...{
                editedTask,
                columns,
                currentColumn,
                users,
                detailsSettings,
                setDetailsSettings,
                boardId,
                newTag,
                setNewTag,
                datePickerOpen,
                setDatePickerOpen,
                githubBranches,
                newBranchName,
                setNewBranchName,
                availableTicketsForParent,
                ticketDetailsParentKey: ticketDetails?.relatedTickets.parent?.ticketKey,
                onStatusChange: handleStatusChange,
                onUpdatePriority: handleUpdatePriority,
                onUpdateField: handleUpdateField as any,
                onUpdateDate: handleUpdateDate,
                onAddTag: handleAddTag,
                onRemoveTag: handleRemoveTag,
                onUpdateParent: handleUpdateParent,
                onAddBranch: handleAddBranch,
                onUpdateBranchStatus: handleUpdateBranchStatus,
                onUpdatePullRequestUrl: handleUpdatePullRequestUrl,
                getAvailableParents,
              } as any}
            />
          </div>
        </div>
      </div>
    </>
  )
}
