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
  MARK_CONVERSATION_READ,
  ARCHIVE_CONVERSATION,
  UNARCHIVE_CONVERSATION,
  DELETE_CONVERSATION,
} from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { ConversationWithParticipants } from '@/types/chat'

type ConversationsState = {
  conversations: ConversationWithParticipants[]
  archivedConversations: ConversationWithParticipants[]
  activeConversationId: string | null
  unreadCounts: Record<string, number>
  loading: boolean
  loadingArchived: boolean
  archivedFetched: boolean
  error: string | null
  pendingConversationRequests: Map<string, Promise<ConversationWithParticipants>>
}

type ConversationsActions = {
  fetchConversations: () => Promise<void>
  fetchArchivedConversations: () => Promise<void>
  fetchConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string | null) => void
  markAsRead: (conversationId: string) => Promise<void>
  updateUnreadCount: (conversationId: string, count: number) => void
  updateConversationLastMessage: (conversationId: string, message: { id: string; content: string; createdAt: string; cid?: string; senderId?: string; type?: string }) => void
  findDirectConversationByUserId: (userId: string) => ConversationWithParticipants | null
  getOrCreateDirectConversation: (userId: string) => Promise<ConversationWithParticipants>
  createDirectConversation: (userId: string) => Promise<ConversationWithParticipants>
  createGroupConversation: (input: { name: string; description?: string; avatar?: string; participants: string[]; admins?: string[] }) => Promise<ConversationWithParticipants>
  updateGroup: (conversationId: string, updates: { name?: string; description?: string; avatar?: string; admins?: string[] }) => Promise<void>
  addMember: (conversationId: string, userId: string) => Promise<void>
  removeMember: (conversationId: string, userId: string) => Promise<void>
  leaveGroup: (conversationId: string) => Promise<void>
  archiveConversation: (conversationId: string) => Promise<void>
  unarchiveConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChatConversationsStore = create<ConversationsState & ConversationsActions>((set, get) => ({
  conversations: [],
  archivedConversations: [],
  activeConversationId: null,
  unreadCounts: {},
  loading: false,
  loadingArchived: false,
  archivedFetched: false,
  error: null,
  pendingConversationRequests: new Map(),

  fetchConversations: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_CHAT_CONVERSATIONS())
      const conversations = response.data.data || []
      const currentUser = useAuthStore.getState().user
      
      const unreadCounts: Record<string, number> = {}
      conversations.forEach((conv: ConversationWithParticipants) => {
        if (conv.unreadCounts && currentUser?.id) {
          unreadCounts[conv.id] = conv.unreadCounts[currentUser.id] || 0
        }
      })
      
      set({
        conversations,
        unreadCounts: { ...get().unreadCounts, ...unreadCounts },
        loading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversations',
        loading: false,
      })
    }
  },

  fetchArchivedConversations: async () => {
    set({ loadingArchived: true, error: null })
    try {
      const response = await axiosInstance.get(`${GET_CHAT_CONVERSATIONS()}?archived=true`)
      const conversations = response.data.data || []
      const currentUser = useAuthStore.getState().user
      
      const unreadCounts: Record<string, number> = {}
      conversations.forEach((conv: ConversationWithParticipants) => {
        if (conv.unreadCounts && currentUser?.id) {
          unreadCounts[conv.id] = conv.unreadCounts[currentUser.id] || 0
        }
      })
      
      set({
        archivedConversations: conversations,
        unreadCounts: { ...get().unreadCounts, ...unreadCounts },
        loadingArchived: false,
        archivedFetched: true,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch archived conversations',
        loadingArchived: false,
        archivedFetched: true,
      })
    }
  },

  fetchConversation: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.get(GET_CHAT_CONVERSATION(id))
      const conversation = response.data.data
      const currentUser = useAuthStore.getState().user
      
      const unreadCounts: Record<string, number> = {}
      if (conversation.unreadCounts && currentUser?.id) {
        unreadCounts[conversation.id] = conversation.unreadCounts[currentUser.id] || 0
      }
      
      set((state) => ({
        conversations: state.conversations.find((c) => c.id === id)
          ? state.conversations.map((c) => (c.id === id ? conversation : c))
          : [conversation, ...state.conversations],
        unreadCounts: { ...state.unreadCounts, ...unreadCounts },
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
      console.error('Failed to mark as read:', error)
    }
  },

  updateUnreadCount: (conversationId: string, count: number) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: count,
      },
    }))
  },

  updateConversationLastMessage: (conversationId: string, message: { id: string; content: string; createdAt: string; cid?: string; senderId?: string; type?: string }) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                id: message.id,
                cid: message.cid || message.id,
                conversationId,
                senderId: message.senderId || '',
                content: message.content,
                type: (message.type as 'text' | 'image' | 'file' | 'system') || 'text',
                status: 'sent' as const,
                attachments: [],
                readBy: [],
                createdAt: message.createdAt,
                updatedAt: message.createdAt,
              },
              lastMessageAt: message.createdAt,
              lastMessageId: message.id,
            }
          : c
      ),
    }))
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
    const existing = get().findDirectConversationByUserId(userId)
    if (existing) {
      return existing
    }
    
    return get().createDirectConversation(userId)
  },

  createDirectConversation: async (userId: string) => {
    const existing = get().findDirectConversationByUserId(userId)
    if (existing) {
      return existing
    }

    const pendingRequests = get().pendingConversationRequests
    if (pendingRequests.has(userId)) {
      return pendingRequests.get(userId)!
    }

    const requestPromise = (async () => {
      set({ loading: true, error: null })
      try {
        const response = await axiosInstance.post(CREATE_DIRECT_CONVERSATION(), { userId })
        const conversation = response.data.data
        
        set((state) => {
          const alreadyExists = state.conversations.some(c => c.id === conversation.id)
          
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

  archiveConversation: async (conversationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.post(ARCHIVE_CONVERSATION(conversationId))
      const conversation = response.data.data
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        archivedConversations: [...state.archivedConversations, conversation],
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to archive conversation',
        loading: false,
      })
      throw error
    }
  },

  unarchiveConversation: async (conversationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.post(UNARCHIVE_CONVERSATION(conversationId))
      const conversation = response.data.data
      set((state) => ({
        archivedConversations: state.archivedConversations.filter((c) => c.id !== conversationId),
        conversations: [...state.conversations, conversation],
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to unarchive conversation',
        loading: false,
      })
      throw error
    }
  },

  deleteConversation: async (conversationId: string) => {
    set({ loading: true, error: null })
    try {
      await axiosInstance.delete(DELETE_CONVERSATION(conversationId))
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        loading: false,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete conversation',
        loading: false,
      })
      throw error
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}))
