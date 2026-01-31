export interface Conversation {
  id: string
  type: 'direct' | 'group'
  participants: string[]
  name?: string
  description?: string
  avatar?: string
  createdBy: string
  admins: string[]
  lastMessageAt?: string
  lastMessageId?: string
  createdAt: string
  updatedAt: string
}

export type ConversationWithParticipants = Omit<Conversation, 'participants'> & {
  participants: Array<{
    id: string
    name: string
    email: string
    profilePic?: string
  }>
  lastMessage?: Message
}

export interface Message {
  id: string
  cid: string // Client Correlation ID for idempotency
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  status: 'sending' | 'sent' | 'error' // Client-side status tracking
  attachments: Array<{
    url: string
    type: string
    name: string
    size: number
  }>
  replyTo?: string
  readBy: Array<{
    userId: string
    readAt: string
  }>
  editedAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MessageWithSender extends Omit<Message, 'sender'> {
  sender: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export interface Participant {
  id: string
  name: string
  email: string
  profilePic?: string
}

export interface ReadReceipt {
  userId: string
  readAt: string
}

export interface TypingIndicator {
  conversationId: string
  userId: string
  userName?: string
  isTyping: boolean
  timestamp: string
}

// Socket event types
export interface ChatMessageAckEvent {
  cid: string
  id: string
  status: 'success' | 'duplicate' | 'error'
  error?: string
}

export interface ChatMessageReceivedEvent {
  message: MessageWithSender
  conversationId: string
  timestamp: string
}

export interface ChatTypingEvent {
  conversationId: string
  userId: string
  userName?: string
  isTyping: boolean
  timestamp: string
}

export interface ChatReadEvent {
  conversationId: string
  messageId?: string
  userId: string
  userName?: string
  timestamp: string
}

export interface ChatConversationUpdatedEvent {
  conversation: ConversationWithParticipants
  timestamp: string
}

export interface ChatMemberAddedEvent {
  conversationId: string
  member: Participant
  timestamp: string
}

export interface ChatMemberRemovedEvent {
  conversationId: string
  userId: string
  timestamp: string
}

export interface ChatMessageEditedEvent {
  message: Message
  timestamp: string
}

export interface ChatMessageDeletedEvent {
  messageId: string
  conversationId: string
  timestamp: string
}

export interface ChatDeltaSyncEvent {
  conversationId: string
  messages: MessageWithSender[]
  timestamp: string
}

export interface ChatErrorEvent {
  message: string
}
