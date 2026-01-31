import type { Socket } from 'socket.io-client'
import { useChatStore } from '@/stores/chat.store'
import type {
  ChatMessageReceivedEvent,
  ChatTypingEvent,
  ChatReadEvent,
  ChatConversationUpdatedEvent,
  ChatMemberAddedEvent,
  ChatMemberRemovedEvent,
  ChatMessageEditedEvent,
  ChatMessageDeletedEvent,
  ChatErrorEvent,
} from '@/types/chat'

/**
 * Register socket handlers for chat module
 * Called when socket connects
 */
export function registerChatHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: unknown[]) => void>
): void {
  const handleMessageReceived = (data: ChatMessageReceivedEvent) => {
    const { addMessage, updateUnreadCount } = useChatStore.getState()
    addMessage(data.conversationId, data.message)
    
    // Update unread count if not active conversation
    const { activeConversationId } = useChatStore.getState()
    if (activeConversationId !== data.conversationId) {
      const currentCount = useChatStore.getState().unreadCounts[data.conversationId] || 0
      updateUnreadCount(data.conversationId, currentCount + 1)
    }
  }

  const handleTyping = (data: ChatTypingEvent) => {
    const { setTyping } = useChatStore.getState()
    setTyping(data.conversationId, data.userId, data.isTyping)
  }

  const handleRead = (data: ChatReadEvent) => {
    const { updateMessage, activeConversationId } = useChatStore.getState()
    
    if (data.messageId) {
      // Update specific message read status
      const messages = useChatStore.getState().messages[data.conversationId] || []
      const message = messages.find((m) => m.id === data.messageId)
      if (message) {
        const readBy = message.readBy || []
        if (!readBy.some((r) => r.userId === data.userId)) {
          updateMessage(data.conversationId, data.messageId, {
            readBy: [
              ...readBy,
              {
                userId: data.userId,
                readAt: data.timestamp,
              },
            ],
          })
        }
      }
    } else if (activeConversationId === data.conversationId) {
      // Mark all messages as read for this user
      const messages = useChatStore.getState().messages[data.conversationId] || []
      messages.forEach((message) => {
        const readBy = message.readBy || []
        if (!readBy.some((r) => r.userId === data.userId)) {
          updateMessage(data.conversationId, message.id, {
            readBy: [
              ...readBy,
              {
                userId: data.userId,
                readAt: data.timestamp,
              },
            ],
          })
        }
      })
    }
  }

  const handleConversationUpdated = (data: ChatConversationUpdatedEvent) => {
    const { conversations } = useChatStore.getState()
    useChatStore.setState({
      conversations: conversations.map((c) =>
        c.id === data.conversation.id ? data.conversation : c
      ),
    })
  }

  const handleMemberAdded = (data: ChatMemberAddedEvent) => {
    const { fetchConversation } = useChatStore.getState()
    // Refresh conversation to get updated participant list
    fetchConversation(data.conversationId)
  }

  const handleMemberRemoved = (data: ChatMemberRemovedEvent) => {
    const { fetchConversation } = useChatStore.getState()
    // Refresh conversation to get updated participant list
    fetchConversation(data.conversationId)
  }

  const handleMessageEdited = (data: ChatMessageEditedEvent) => {
    const { updateMessage } = useChatStore.getState()
    updateMessage(data.message.conversationId, data.message.id, data.message)
  }

  const handleMessageDeleted = (data: ChatMessageDeletedEvent) => {
    const { removeMessage } = useChatStore.getState()
    removeMessage(data.conversationId, data.messageId)
  }

  const handleError = (data: ChatErrorEvent) => {
    useChatStore.getState().setError(data.message)
  }

  // Register event listeners
  socket.on('chat:message-received', handleMessageReceived)
  socket.on('chat:typing', handleTyping)
  socket.on('chat:read', handleRead)
  socket.on('chat:conversation-updated', handleConversationUpdated)
  socket.on('chat:member-added', handleMemberAdded)
  socket.on('chat:member-removed', handleMemberRemoved)
  socket.on('chat:message-edited', handleMessageEdited)
  socket.on('chat:message-deleted', handleMessageDeleted)
  socket.on('chat:error', handleError)

  // Store handlers for cleanup
  eventHandlers.set('chat:message-received', handleMessageReceived)
  eventHandlers.set('chat:typing', handleTyping)
  eventHandlers.set('chat:read', handleRead)
  eventHandlers.set('chat:conversation-updated', handleConversationUpdated)
  eventHandlers.set('chat:member-added', handleMemberAdded)
  eventHandlers.set('chat:member-removed', handleMemberRemoved)
  eventHandlers.set('chat:message-edited', handleMessageEdited)
  eventHandlers.set('chat:message-deleted', handleMessageDeleted)
  eventHandlers.set('chat:error', handleError)
}
