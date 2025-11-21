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
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprints?: Sprint[]
  sprintStartDate?: string // Deprecated
  sprintEndDate?: string // Deprecated
  sprintGoal?: string // Deprecated
  createdAt: string
  updatedAt: string
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
  name?: string
  memberIds?: string[]
  columns?: string[]
  columnLimits?: Record<string, number>
  sprintStartDate?: string | null
  sprintEndDate?: string | null
  sprintGoal?: string
}

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

