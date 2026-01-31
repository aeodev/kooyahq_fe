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
  ChatMessageAckEvent,
  ChatDeltaSyncEvent,
} from '@/types/chat'

/**
 * Register socket handlers for chat module
 * Called when socket connects
 */
export function registerChatHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: any[]) => void>
): void {
  const handleMessageAck = (data: ChatMessageAckEvent) => {
    const { updateMessageStatus } = useChatStore.getState()

    if (data.status === 'success') {
      // Update message with server ID and mark as sent
      updateMessageStatus(data.cid, {
        id: data.id,
        status: 'sent'
      })
    } else if (data.status === 'error') {
      // Mark message as failed
      updateMessageStatus(data.cid, {
        status: 'error'
      })
    }
    // For 'duplicate' status, we don't need to do anything as message is already processed
  }

  const handleNewMessage = (data: ChatMessageReceivedEvent) => {
    const { addMessage, updateUnreadCount, activeConversationId } = useChatStore.getState()
    addMessage(data.conversationId, data.message)

    // Update unread count if not active conversation
    if (activeConversationId !== data.conversationId) {
      const currentCount = useChatStore.getState().unreadCounts[data.conversationId] || 0
      updateUnreadCount(data.conversationId, currentCount + 1)
    }
  }

  const handleDeltaMessages = (data: ChatDeltaSyncEvent) => {
    const { syncMessages, setLastSyncPoint } = useChatStore.getState()
    syncMessages(data.conversationId, data.messages)

    // Update sync timestamp
    if (data.messages.length > 0) {
      const latestMessage = data.messages[data.messages.length - 1]
      setLastSyncPoint(data.conversationId, latestMessage.id, latestMessage.createdAt)
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
      const messages = useChatStore.getState().messages.get(data.conversationId) || []
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
      const messages = useChatStore.getState().messages.get(data.conversationId) || []
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
  socket.on('message_ack', handleMessageAck)
  socket.on('new_message', handleNewMessage)
  socket.on('delta_messages', handleDeltaMessages)
  socket.on('chat:typing', handleTyping)
  socket.on('chat:read', handleRead)
  socket.on('chat:conversation-updated', handleConversationUpdated)
  socket.on('chat:member-added', handleMemberAdded)
  socket.on('chat:member-removed', handleMemberRemoved)
  socket.on('chat:message-edited', handleMessageEdited)
  socket.on('chat:message-deleted', handleMessageDeleted)
  socket.on('chat:error', handleError)

  // Store handlers for cleanup
  eventHandlers.set('message_ack', handleMessageAck)
  eventHandlers.set('new_message', handleNewMessage)
  eventHandlers.set('delta_messages', handleDeltaMessages)
  eventHandlers.set('chat:typing', handleTyping)
  eventHandlers.set('chat:read', handleRead)
  eventHandlers.set('chat:conversation-updated', handleConversationUpdated)
  eventHandlers.set('chat:member-added', handleMemberAdded)
  eventHandlers.set('chat:member-removed', handleMemberRemoved)
  eventHandlers.set('chat:message-edited', handleMessageEdited)
  eventHandlers.set('chat:message-deleted', handleMessageDeleted)
  eventHandlers.set('chat:error', handleError)
}
