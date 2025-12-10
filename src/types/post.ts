export type ReactionType = 'heart' | 'wow' | 'haha'

export interface Post {
  id: string
  content: string
  imageUrl?: string
  category?: string
  tags: string[]
  draft: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
  poll?: {
    question: string
    options: {
      text: string
      votes: string[]
    }[]
    endDate?: string
  }
}

export interface PostComment {
  id: string
  postId: string
  userId: string
  content: string
  mentions: string[]
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export interface PostReaction {
  id: string
  postId: string
  userId: string
  type: ReactionType
  createdAt: string
  updatedAt: string
  author?: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export interface ReactionCounts {
  heart: number
  wow: number
  haha: number
  userReaction?: ReactionType
}

export interface Notification {
  id: string
  userId: string
  type: 'post_created' | 'comment' | 'reaction' | 'mention' | 'system' | 'card_assigned' | 'card_comment' | 'card_moved' | 'board_member_added' | 'game_invitation'
  postId?: string
  commentId?: string
  reactionId?: string
  mentionId?: string
  cardId?: string
  boardId?: string
  title?: string
  url?: string
  read: boolean
  createdAt: string
  updatedAt: string
  actor?: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

