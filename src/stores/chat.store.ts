import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_CHAT_CONVERSATIONS,
  GET_CHAT_CONVERSATION,
  CREATE_DIRECT_CONVERSATION,
  CREATE_GROUP_CONVERSATION,
  UPDATE_CHAT_CONVERSATION,
  ADD_GROUP_MEMBER,
  REMOVE_GROUP_MEMBER,
  LEAVE_GROUP,
  GET_CHAT_MESSAGES,
  SEND_CHAT_MESSAGE,
  UPDATE_CHAT_MESSAGE,
  DELETE_CHAT_MESSAGE,
  MARK_CONVERSATION_READ,
  GET_CHAT_UNREAD_COUNT,
} from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type {
  ConversationWithParticipants,
  MessageWithSender,
} from '@/types/chat'

type ChatState = {
  conversations: ConversationWithParticipants[]
  activeConversationId: string | null
  messages: Record<string, MessageWithSender[]>
  typingUsers: Record<string, Set<string>>
  unreadCounts: Record<string, number>
  loading: boolean
  error: string | null
  pendingConversationRequests: Map<string, Promise<ConversationWithParticipants>>
}

type ChatActions = {
  fetchConversations: () => Promise<void>
  fetchConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string | null) => void
  fetchMessages: (conversationId: string, options?: { page?: number; limit?: number; before?: string }) => Promise<void>
  sendMessage: (conversationId: string, content: string, type?: string, attachments?: any[], replyTo?: string) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  findDirectConversationByUserId: (userId: string) => ConversationWithParticipants | null
  getOrCreateDirectConversation: (userId: string) => Promise<ConversationWithParticipants>
  createDirectConversation: (userId: string) => Promise<ConversationWithParticipants>
  createGroupConversation: (input: { name: string; description?: string; avatar?: string; participants: string[]; admins?: string[] }) => Promise<ConversationWithParticipants>
  updateGroup: (conversationId: string, updates: { name?: string; description?: string; avatar?: string; admins?: string[] }) => Promise<void>
  addMember: (conversationId: string, userId: string) => Promise<void>
  removeMember: (conversationId: string, userId: string) => Promise<void>
  leaveGroup: (conversationId: string) => Promise<void>
  addMessage: (conversationId: string, message: MessageWithSender) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithSender>) => void
  removeMessage: (conversationId: string, messageId: string) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  updateUnreadCount: (conversationId: string, count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},
  loading: false,
  error: null,
  pendingConversationRequests: new Map(),

  fetchConversations: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_CHAT_CONVERSATIONS())
      set({
        conversations: response.data.data || [],
        loading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversations',
        loading: false,
      })
    }
  },

  fetchConversation: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_CHAT_CONVERSATION(id))
      const conversation = response.data.data
      
      // Update conversations list
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? conversation : c
        ).concat(
          state.conversations.find((c) => c.id === id) ? [] : [conversation]
        ),
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversation',
        loading: false,
      })
    }
  },

  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id })
    if (id) {
      get().markAsRead(id)
    }
  },

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
      const newMessages = response.data.data || []
      
      set((state) => {
        const existingMessages = state.messages[conversationId] || []
        const messageIds = new Set(existingMessages.map((m) => m.id))
        const uniqueNewMessages = newMessages.filter((m: MessageWithSender) => !messageIds.has(m.id))
        
        return {
          messages: {
            ...state.messages,
            [conversationId]: options.before
              ? [...uniqueNewMessages, ...existingMessages]
              : [...existingMessages, ...uniqueNewMessages],
          },
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

  sendMessage: async (conversationId: string, content: string, type = 'text', attachments?: any[], replyTo?: string) => {
    // Validate inputs before sending
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Conversation ID is required')
    }
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('Message content is required')
    }
    
    // Validate message type
    const validTypes = ['text', 'image', 'file', 'system']
    if (type && !validTypes.includes(type)) {
      throw new Error(`Invalid message type: ${type}. Must be one of: ${validTypes.join(', ')}`)
    }
    
    try {
      const response = await axiosInstance.post(SEND_CHAT_MESSAGE(conversationId), {
        content: content.trim(),
        type: type || 'text',
        attachments: attachments || undefined,
        replyTo: replyTo || undefined,
      })
      const message = response.data.data
      get().addMessage(conversationId, message)
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to send message',
      })
      throw error
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      await axiosInstance.put(MARK_CONVERSATION_READ(conversationId))
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [conversationId]: 0,
        },
      }))
    } catch (error) {
      // Silently fail - not critical
      console.error('Failed to mark as read:', error)
    }
  },

  findDirectConversationByUserId: (userId: string) => {
    const { conversations } = get()
    const currentUser = useAuthStore.getState().user
    
    if (!currentUser) return null
    
    return conversations.find(conv => 
      conv.type === 'direct' && 
      conv.participants.some(p => p.id === userId) &&
      conv.participants.some(p => p.id === currentUser.id)
    ) || null
  },

  getOrCreateDirectConversation: async (userId: string) => {
    // 1. Check local cache first
    const existing = get().findDirectConversationByUserId(userId)
    if (existing) {
      return existing
    }
    
    // 2. Only call API if not found locally
    return get().createDirectConversation(userId)
  },

  createDirectConversation: async (userId: string) => {
    // Check if already exists before API call (defensive check)
    const existing = get().findDirectConversationByUserId(userId)
    if (existing) {
      return existing
    }

    // Request deduplication: check if there's already a pending request
    const pendingRequests = get().pendingConversationRequests
    if (pendingRequests.has(userId)) {
      return pendingRequests.get(userId)!
    }

    // Create the request promise
    const requestPromise = (async () => {
      set({ loading: true, error: null })
      try {
        const response = await axiosInstance.post(CREATE_DIRECT_CONVERSATION(), { userId })
        const conversation = response.data.data
        
        set((state) => {
          // Prevent duplicate conversations in state
          const alreadyExists = state.conversations.some(c => c.id === conversation.id)
          
          // Remove from pending requests
          const updatedPendingRequests = new Map(state.pendingConversationRequests)
          updatedPendingRequests.delete(userId)
          
          return {
            conversations: alreadyExists 
              ? state.conversations.map(c => c.id === conversation.id ? conversation : c)
              : [conversation, ...state.conversations],
            loading: false,
            pendingConversationRequests: updatedPendingRequests,
          }
        })
        
        return conversation
      } catch (error: any) {
        // Remove from pending requests on error
        set((state) => {
          const updatedPendingRequests = new Map(state.pendingConversationRequests)
          updatedPendingRequests.delete(userId)
          return {
            error: error.response?.data?.message || 'Failed to create conversation',
            loading: false,
            pendingConversationRequests: updatedPendingRequests,
          }
        })
        throw error
      }
    })()

    // Store the pending request
    const updatedPendingRequests = new Map(pendingRequests)
    updatedPendingRequests.set(userId, requestPromise)
    set({ pendingConversationRequests: updatedPendingRequests })

    return requestPromise
  },

  createGroupConversation: async (input) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.post(CREATE_GROUP_CONVERSATION(), input)
      const conversation = response.data.data
      
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        loading: false,
      }))
      
      return conversation
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create group',
        loading: false,
      })
      throw error
    }
  },

  updateGroup: async (conversationId: string, updates) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.put(UPDATE_CHAT_CONVERSATION(conversationId), updates)
      const conversation = response.data.data
      
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? conversation : c
        ),
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update group',
        loading: false,
      })
      throw error
    }
  },

  addMember: async (conversationId: string, userId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.post(ADD_GROUP_MEMBER(conversationId), { userId })
      const conversation = response.data.data
      
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? conversation : c
        ),
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add member',
        loading: false,
      })
      throw error
    }
  },

  removeMember: async (conversationId: string, userId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.delete(REMOVE_GROUP_MEMBER(conversationId, userId))
      const conversation = response.data.data
      
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? conversation : c
        ),
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to remove member',
        loading: false,
      })
      throw error
    }
  },

  leaveGroup: async (conversationId: string) => {
    set({ loading: true, error: null })
    try {
      await axiosInstance.post(LEAVE_GROUP(conversationId))
      
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to leave group',
        loading: false,
      })
      throw error
    }
  },

  addMessage: (conversationId: string, message: MessageWithSender) => {
    set((state) => {
      const existingMessages = state.messages[conversationId] || []
      const messageIds = new Set(existingMessages.map((m) => m.id))
      
      if (messageIds.has(message.id)) {
        return state
      }
      
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, message],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c
        ),
      }
    })
  },

  updateMessage: (conversationId: string, messageId: string, updates: Partial<MessageWithSender>) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    }))
  },

  removeMessage: (conversationId: string, messageId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).filter((m) => m.id !== messageId),
      },
    }))
  },

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    set((state) => {
      const typingSet = state.typingUsers[conversationId] || new Set<string>()
      if (isTyping) {
        typingSet.add(userId)
      } else {
        typingSet.delete(userId)
      }
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: typingSet,
        },
      }
    })
  },

  updateUnreadCount: (conversationId: string, count: number) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: count,
      },
    }))
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}))
