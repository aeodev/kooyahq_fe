import type { Socket } from 'socket.io-client'
import { useChatMessagesStore } from '@/stores/chat-messages.store'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import { useChatTypingStore } from '@/stores/chat-typing.store'
import { useAuthStore } from '@/stores/auth.store'
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

export function registerChatHandlers(
  socket: Socket,
  eventHandlers: Map<string, (...args: any[]) => void>
): void {
  const handleMessageAck = (data: ChatMessageAckEvent) => {
    const { updateMessageStatus } = useChatMessagesStore.getState()

    if (data.status === 'success') {
      updateMessageStatus(data.cid, {
        id: data.id,
        status: 'sent'
      })
    } else if (data.status === 'error') {
      updateMessageStatus(data.cid, {
        status: 'error'
      })
    }
  }

  const handleNewMessage = async (data: ChatMessageReceivedEvent) => {
    const { addMessage } = useChatMessagesStore.getState()
    const {
      activeConversationId,
      conversations,
      fetchConversation,
      updateConversationLastMessage
    } = useChatConversationsStore.getState()
    const { messages } = useChatMessagesStore.getState()
    const { user } = useAuthStore.getState()
    
    // Single duplicate check by cid or id
    const existingMessages = messages.get(data.conversationId) || []
    const alreadyExists = existingMessages.some(
      (m) => (m.cid && m.cid === data.message.cid) || m.id === data.message.id
    )
    
    if (!alreadyExists) {
      addMessage(data.conversationId, data.message)
    }

    const conversationExists = conversations.some(c => c.id === data.conversationId)
    const isNotActive = activeConversationId !== data.conversationId
    const isNotFromSelf = data.message.senderId !== user?.id
    
    if (!conversationExists) {
      try {
        await fetchConversation(data.conversationId)
      } catch (error) {
        console.error('Failed to fetch conversation:', error)
      }
    }
    
    updateConversationLastMessage(data.conversationId, {
      id: data.message.id,
      cid: data.message.cid,
      senderId: data.message.senderId,
      content: data.message.content,
      type: data.message.type,
      createdAt: data.message.createdAt,
    })
    
    if (isNotActive && isNotFromSelf) {
      const state = useChatConversationsStore.getState()
      const currentCount = state.unreadCounts[data.conversationId] || 0
      state.updateUnreadCount(data.conversationId, currentCount + 1)
    }

    if (isNotActive && isNotFromSelf && 'Notification' in window && Notification.permission === 'granted') {
      const updatedConversations = useChatConversationsStore.getState().conversations
      const conversation = updatedConversations.find(c => c.id === data.conversationId)
      const conversationName = conversation?.type === 'group' 
        ? conversation.name || 'Group Chat'
        : conversation?.participants.find(p => p.id !== user?.id)?.name || data.message.sender.name
      
      const notification = new Notification(conversationName, {
        body: data.message.content || 'Sent an attachment',
        icon: data.message.sender.profilePic || undefined,
        tag: `chat-${data.conversationId}`,
        requireInteraction: false,
      })

      setTimeout(() => {
        notification.close()
      }, 5000)

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }
  }

  const handleDeltaMessages = (data: ChatDeltaSyncEvent) => {
    const { syncMessages, setLastSyncPoint } = useChatMessagesStore.getState()
    syncMessages(data.conversationId, data.messages)

    if (data.messages.length > 0) {
      const latestMessage = data.messages[data.messages.length - 1]
      setLastSyncPoint(data.conversationId, latestMessage.id, latestMessage.createdAt)
    }
  }

  const handleTyping = (data: ChatTypingEvent) => {
    const { setTyping } = useChatTypingStore.getState()
    setTyping(data.conversationId, data.userId, data.isTyping)
  }

  const handleRead = (data: ChatReadEvent) => {
    const { updateMessage } = useChatMessagesStore.getState()
    const { activeConversationId } = useChatConversationsStore.getState()
    
    if (data.messageId) {
      const messages = useChatMessagesStore.getState().messages.get(data.conversationId) || []
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
      const messages = useChatMessagesStore.getState().messages.get(data.conversationId) || []
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
    const { conversations } = useChatConversationsStore.getState()
    useChatConversationsStore.setState({
      conversations: conversations.map((c) =>
        c.id === data.conversation.id ? data.conversation : c
      ),
    })
  }

  const handleMemberAdded = (data: ChatMemberAddedEvent) => {
    const { fetchConversation } = useChatConversationsStore.getState()
    fetchConversation(data.conversationId)
  }

  const handleMemberRemoved = (data: ChatMemberRemovedEvent) => {
    const { fetchConversation } = useChatConversationsStore.getState()
    fetchConversation(data.conversationId)
  }

  const handleMessageEdited = (data: ChatMessageEditedEvent) => {
    const { updateMessage } = useChatMessagesStore.getState()
    updateMessage(data.message.conversationId, data.message.id, data.message)
  }

  const handleMessageDeleted = (data: ChatMessageDeletedEvent) => {
    const { removeMessage } = useChatMessagesStore.getState()
    removeMessage(data.conversationId, data.messageId)
  }

  const handleError = (data: ChatErrorEvent) => {
    useChatConversationsStore.getState().setError(data.message)
  }

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
