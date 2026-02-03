import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import { GET_CHAT_MESSAGES } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import type { MessageWithSender } from '@/types/chat'

const sortMessagesByCreatedAt = (messages: MessageWithSender[]): MessageWithSender[] => {
  return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

type MessagesState = {
  messages: Map<string, MessageWithSender[]>
  fetchedConversations: Set<string>
  lastMessageTimestamp: Record<string, string>
  loading: boolean
  error: string | null
}

type MessagesActions = {
  fetchMessages: (conversationId: string, options?: { page?: number; limit?: number; before?: string }) => Promise<void>
  sendMessage: (conversationId: string, content: string, type?: string, attachments?: any[], replyTo?: string) => Promise<string>
  addMessage: (conversationId: string, message: MessageWithSender) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithSender>) => void
  updateMessageStatus: (cid: string, updates: Partial<MessageWithSender>) => void
  removeMessage: (conversationId: string, messageId: string) => void
  syncMessages: (conversationId: string, messages: MessageWithSender[]) => void
  getLastMessageTimestamp: (conversationId: string) => string | null
  setLastSyncPoint: (conversationId: string, messageId: string, timestamp: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChatMessagesStore = create<MessagesState & MessagesActions>((set, get) => ({
  messages: new Map(),
  fetchedConversations: new Set(),
  lastMessageTimestamp: {},
  loading: false,
  error: null,

  fetchMessages: async (conversationId: string, options = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (options.page) params.append('page', String(options.page))
      if (options.limit) params.append('limit', String(options.limit))
      if (options.before) params.append('before', options.before)

      const response = await axiosInstance.get(
        `${GET_CHAT_MESSAGES(conversationId)}${params.toString() ? `?${params.toString()}` : ''}`
      )
      const newMessages: MessageWithSender[] = response.data.data || []

      set((state) => {
        const existingMessages = state.messages.get(conversationId) || []
        const messageIds = new Set(existingMessages.map((m) => m.id))
        const uniqueNewMessages = newMessages.filter((m: MessageWithSender) => !messageIds.has(m.id))

        const updatedMessages = sortMessagesByCreatedAt(
          options.before
            ? [...uniqueNewMessages, ...existingMessages]
            : [...existingMessages, ...uniqueNewMessages]
        )

        const newMessagesMap = new Map(state.messages)
        newMessagesMap.set(conversationId, updatedMessages)

        const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
        if (updatedMessages.length > 0) {
          newLastMessageTimestamp[conversationId] = updatedMessages[updatedMessages.length - 1].createdAt
        }

        return {
          messages: newMessagesMap,
          lastMessageTimestamp: newLastMessageTimestamp,
          fetchedConversations: new Set([...state.fetchedConversations, conversationId]),
          loading: false,
        }
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch messages',
        loading: false,
      })
    }
  },

  sendMessage: async (conversationId: string, content: string, type = 'text', attachments?: any[], replyTo?: string): Promise<string> => {
    const cid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Conversation ID is required')
    }

    const hasAttachments = attachments && attachments.length > 0
    const hasContent = content && typeof content === 'string' && content.trim()
    
    if (!hasContent && !hasAttachments) {
      throw new Error('Message content or attachments are required')
    }

    const validTypes = ['text', 'image', 'file', 'system']
    if (type && !validTypes.includes(type)) {
      throw new Error(`Invalid message type: ${type}. Must be one of: ${validTypes.join(', ')}`)
    }

    const optimisticMessage: MessageWithSender = {
      id: cid,
      cid,
      conversationId,
      senderId: useAuthStore.getState().user?.id || '',
      content: hasContent ? content.trim() : '',
      type: hasAttachments && !hasContent ? 'image' : (type as any),
      status: 'sending',
      attachments: attachments || [],
      replyTo,
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: useAuthStore.getState().user?.id || '',
        name: useAuthStore.getState().user?.name || '',
        email: useAuthStore.getState().user?.email || '',
        profilePic: useAuthStore.getState().user?.profilePic,
      }
    }

    get().addMessage(conversationId, optimisticMessage)

    try {
      const { socket } = useSocketStore.getState()
      if (socket) {
        const messageType = hasAttachments && !hasContent ? 'image' : (type || 'text')
        const messageContent = hasContent ? content.trim() : ''
        
        socket.emit('send_message', {
          cid,
          content: messageContent,
          type: messageType,
          attachments: attachments || undefined,
          replyTo: replyTo || undefined,
          conversationId,
        })
      }

      return cid
    } catch (error: any) {
      get().updateMessageStatus(cid, { status: 'error' })
      set({
        error: error.response?.data?.message || 'Failed to send message',
      })
      throw error
    }
  },

  addMessage: (conversationId: string, message: MessageWithSender) => {
    set((state) => {
      const existingMessages = state.messages.get(conversationId) || []

      // Check for duplicates by cid or id
      const duplicateByCid = message.cid && existingMessages.some((m) => m.cid === message.cid)
      const duplicateById = message.id && existingMessages.some((m) => m.id === message.id)
      
      if (duplicateByCid || duplicateById) {
        return state
      }

      const newMessages = sortMessagesByCreatedAt([...existingMessages, message])
      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, newMessages)

      const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
      newLastMessageTimestamp[conversationId] = message.createdAt

      return {
        messages: newMessagesMap,
        lastMessageTimestamp: newLastMessageTimestamp,
      }
    })
  },

  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithSender>) => {
    set((state) => {
      const messages = state.messages.get(conversationId) || []
      const messageIndex = messages.findIndex((message) => message.id === messageId)
      if (messageIndex === -1) {
        return state
      }

      const updatedMessage = { ...messages[messageIndex], ...updates }
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = updatedMessage

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, updatedMessages)

      return {
        messages: newMessagesMap,
      }
    })
  },

  updateMessageStatus: (cid: string, updates: Partial<MessageWithSender>) => {
    set((state) => {
      // Search all conversations for message with this cid
      let found = false
      const newMessagesMap = new Map(state.messages)

      for (const [conversationId, messages] of state.messages.entries()) {
        const messageIndex = messages.findIndex((m) => m.cid === cid)
        if (messageIndex !== -1) {
          const updatedMessage = { ...messages[messageIndex], ...updates }
          const updatedMessages = [...messages]
          updatedMessages[messageIndex] = updatedMessage
          newMessagesMap.set(conversationId, updatedMessages)
          found = true
          break
        }
      }

      if (!found) {
        return state
      }

      return {
        messages: newMessagesMap,
      }
    })
  },

  syncMessages: (conversationId: string, messages: MessageWithSender[]) => {
    set((state) => {
      const existingMessages = state.messages.get(conversationId) || []
      const existingCids = new Set(existingMessages.map((m) => m.cid).filter(Boolean))
      const existingIds = new Set(existingMessages.map((m) => m.id))

      const mergedMessages = [...existingMessages]
      messages.forEach(msg => {
        const hasCid = msg.cid && existingCids.has(msg.cid)
        const hasId = existingIds.has(msg.id)
        if (!hasCid && !hasId) {
          mergedMessages.push(msg)
        }
      })

      const sortedMessages = sortMessagesByCreatedAt(mergedMessages)

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, sortedMessages)

      const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
      if (sortedMessages.length > 0) {
        newLastMessageTimestamp[conversationId] = sortedMessages[sortedMessages.length - 1].createdAt
      }

      return {
        messages: newMessagesMap,
        lastMessageTimestamp: newLastMessageTimestamp,
      }
    })
  },

  removeMessage: (conversationId: string, messageId: string) => {
    set((state) => {
      const messages = state.messages.get(conversationId) || []
      const updatedMessages = messages.filter((m) => m.id !== messageId)

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, updatedMessages)

      return {
        messages: newMessagesMap,
      }
    })
  },

  getLastMessageTimestamp: (conversationId: string): string | null => {
    return get().lastMessageTimestamp[conversationId] || null
  },

  setLastSyncPoint: (conversationId: string, _messageId: string, timestamp: string) => {
    set((state) => ({
      lastMessageTimestamp: {
        ...state.lastMessageTimestamp,
        [conversationId]: timestamp,
      },
    }))
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}))
