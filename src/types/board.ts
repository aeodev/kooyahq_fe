export type Board = {
  id: string
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprintStartDate?: string
  sprintEndDate?: string
  sprintGoal?: string
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
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: string
  storyPoints?: number
  attachments?: CardAttachment[]
  completed: boolean
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
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: string
  storyPoints?: number
}

export type UpdateCardInput = {
  title?: string
  description?: string
  columnId?: string
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string | null
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: string | null
  storyPoints?: number | null
  completed?: boolean
}

