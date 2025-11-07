export interface Announcement {
  id: string
  title: string
  content: string
  authorId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
  }
}

export type CreateAnnouncementInput = {
  title: string
  content: string
  isActive?: boolean
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  isActive?: boolean
}

