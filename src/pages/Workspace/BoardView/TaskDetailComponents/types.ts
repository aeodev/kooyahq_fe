import type { Task, Column, Assignee, Comment, Priority } from '../types'
import type { Ticket } from '@/types/board'

export type TicketDetailResponse = {
  ticket: Ticket
  history: Array<{
    id: string
    actionType: string
    actorId: string
    changes: Array<{
      field: string
      oldValue: any
      newValue: any
      text: string
    }>
    createdAt: string
  }>
  comments: Array<{
    id: string
    userId: string
    content: any
    createdAt: string
    updatedAt: string
  }>
  relatedTickets: {
    parent: Ticket | null
    children: Ticket[]
    siblings: Ticket[]
    epicTickets: Ticket[]
  }
}

export type { Task, Column, Assignee, Comment, Priority, Ticket }


