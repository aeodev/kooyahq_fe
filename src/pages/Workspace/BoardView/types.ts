// Board View Types

import type { RichTextDoc } from '@/types/rich-text'

export type TaskType = 'task' | 'subtask' | 'epic' | 'story' | 'bug'
export type GroupBy = 'none' | 'assignee' | 'type' | 'tags' | 'subtask' | 'epic' | 'story' | 'priority'
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

export type Assignee = {
  id: string
  name: string
  initials: string
  color: string
  avatar?: string
}

export type Comment = {
  id: string
  author: Assignee
  content: string
  createdAt: Date
  updatedAt?: Date
}

export type Subtask = {
  id: string
  key: string
  title: string
  priority: Priority
  assignee?: Assignee
  status: string
}

export type Task = {
  id: string
  key: string
  title: string
  description: string | RichTextDoc
  type: TaskType
  status: string
  assignee?: Assignee
  priority: Priority
  epic?: string
  story?: string
  labels: string[]
  parent?: string
  dueDate?: Date
  startDate?: Date
  endDate?: Date
  team?: string
  subtasks: Subtask[]
  linkedTasks: string[]
  comments: Comment[]
  createdAt: Date
  updatedAt: Date
}

export type Column = {
  id: string
  name: string
  color: string
  tasks: Task[]
}

export type Board = {
  id: string
  name: string
  key: string
  icon: string
  columns: Column[]
  nextTaskNumber: number
}

