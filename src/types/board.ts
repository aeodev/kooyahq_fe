export type Sprint = {
  id: string
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  state: 'future' | 'active' | 'closed'
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  workspaceId: string
  name: string
  description?: string
  prefix: string
  emoji?: string
  type: 'kanban' | 'sprint'
  settings: {
    defaultView: 'board' | 'list' | 'timeline'
    showSwimlanes: boolean
  }
  columns: Array<{
    id: string
    name: string
    order: number
    hexColor?: string
    wipLimit?: number
    isDoneColumn: boolean
  }>
  members: Array<{
    userId: string
    role: 'admin' | 'member' | 'viewer'
    joinedAt: string
  }>
  createdBy: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
  isFavorite?: boolean
}

export type CardAttachment = {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: string
}

// Legacy Card type - use Ticket instead
export type Card = {
  id: string
  title: string
  description?: string
  boardId: string
  columnId: string
  sprintId?: string
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: string
  storyPoints?: number
  attachments?: CardAttachment[]
  completed: boolean
  epicId?: string
  rank?: number
  flagged?: boolean
  createdAt: string
  updatedAt: string
}

export type Ticket = {
  id: string
  ticketKey: string
  title: string
  description?: any // RichTextDoc
  boardId: string
  columnId: string
  ticketType: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
  parentTicketId?: string
  rootEpicId?: string
  rank: string
  points?: number
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags: string[]
  assigneeId?: string
  reporterId: string
  acceptanceCriteria: Array<{ text: string; completed: boolean }>
  documents: Array<{ url: string; label?: string }>
  attachments?: CardAttachment[]
  startDate?: string
  endDate?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  completedAt?: string
  github?: {
    branchName?: string
    pullRequestUrl?: string
    status?: 'open' | 'merged' | 'closed'
  }
  viewedBy?: Array<{
    userId: string
    viewedAt: string
  }>
}

export type Comment = {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CardActivity = {
  id: string
  cardId: string
  boardId: string
  userId: string
  action: 'created' | 'updated' | 'moved' | 'assigned' | 'completed' | 'deleted' | 'commented'
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, any>
  createdAt: string
}

export type CreateBoardInput = {
  name: string
  type: 'kanban' | 'sprint'
}

export type UpdateBoardInput = {
  timestamp: string
  data: {
    name?: string
    description?: string
    prefix?: string
    emoji?: string
    settings?: {
      defaultView: 'board' | 'list' | 'timeline'
      showSwimlanes: boolean
    }
    columns?: Array<{
      id: string
      name: string
      order: number
      hexColor?: string
      wipLimit?: number
      isDoneColumn: boolean
    }>
    members?: Array<{
      userId: string
      role: 'admin' | 'member' | 'viewer'
      joinedAt: Date
    }>
  }
}

// Legacy Card types - use Ticket types instead
export type CreateCardInput = {
  title: string
  description?: string
  columnId?: string
  sprintId?: string
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: string
  storyPoints?: number
  epicId?: string
  rank?: number
  flagged?: boolean
}

export type UpdateCardInput = {
  title?: string
  description?: string
  columnId?: string
  sprintId?: string | null
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string | null
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: string | null
  storyPoints?: number | null
  completed?: boolean
  epicId?: string | null
  rank?: number | null
  flagged?: boolean
}

export type CreateTicketInput = {
  ticketType: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
  title: string
  description?: any
  parentTicketId?: string
  rootEpicId?: string
  columnId?: string
  rank?: string
  points?: number
  priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags?: string[]
  assigneeId?: string
  acceptanceCriteria?: Array<{ text: string; completed: boolean }>
  documents?: Array<{ url: string; label?: string }>
  startDate?: string
  endDate?: string
  dueDate?: string
  github?: {
    branchName?: string
    pullRequestUrl?: string
    status?: 'open' | 'merged' | 'closed'
  }
}

export type UpdateTicketInput = {
  timestamp: string
  data: {
    title?: string
    description?: any
    ticketType?: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
    parentTicketId?: string | null
    rootEpicId?: string | null
    columnId?: string
    rank?: string
    points?: number | null
    priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
    tags?: string[]
    assigneeId?: string | null
    acceptanceCriteria?: Array<{ text: string; completed: boolean }>
    documents?: Array<{ url: string; label?: string }>
    startDate?: string | null
    endDate?: string | null
    dueDate?: string | null
    github?: {
      branchName?: string
      pullRequestUrl?: string
      status?: 'open' | 'merged' | 'closed'
    }
  }
}

