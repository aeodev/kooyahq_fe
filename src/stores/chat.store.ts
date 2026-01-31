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
  MARK_CONVERSATION_READ,
  ARCHIVE_CONVERSATION,
  UNARCHIVE_CONVERSATION,
  DELETE_CONVERSATION,
} from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import type {
  ConversationWithParticipants,
  MessageWithSender,
} from '@/types/chat'

type ChatState = {
  conversations: ConversationWithParticipants[]
  archivedConversations: ConversationWithParticipants[]
  activeConversationId: string | null
  messages: Map<string, MessageWithSender[]> // conversationId -> messages array
  messageMap: Map<string, MessageWithSender> // cid -> message for O(1) lookups
  typingUsers: Record<string, Set<string>>
  unreadCounts: Record<string, number>
  lastMessageTimestamp: Record<string, string> // For delta sync
  loading: boolean
  loadingArchived: boolean
  archivedFetched: boolean // Track if we've attempted to fetch archived conversations
  error: string | null
  pendingConversationRequests: Map<string, Promise<ConversationWithParticipants>>
}

type ChatActions = {
  fetchConversations: () => Promise<void>
  fetchArchivedConversations: () => Promise<void>
  fetchConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string | null) => void
  fetchMessages: (conversationId: string, options?: { page?: number; limit?: number; before?: string }) => Promise<void>
  sendMessage: (conversationId: string, content: string, type?: string, attachments?: any[], replyTo?: string) => Promise<string> // Returns CID
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
  updateMessageStatus: (cid: string, updates: Partial<MessageWithSender>) => void
  removeMessage: (conversationId: string, messageId: string) => void
  syncMessages: (conversationId: string, messages: MessageWithSender[]) => void
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  updateUnreadCount: (conversationId: string, count: number) => void
  getLastMessageTimestamp: (conversationId: string) => string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  archiveConversation: (conversationId: string) => Promise<void>
  unarchiveConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  conversations: [],
  archivedConversations: [],
  activeConversationId: null,
  messages: new Map(),
  messageMap: new Map(),
  typingUsers: {},
  unreadCounts: {},
  lastMessageTimestamp: {},
  loading: false,
  loadingArchived: false,
  archivedFetched: false,
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

  fetchArchivedConversations: async () => {
    set({ loadingArchived: true, error: null })
    try {
      const response = await axiosInstance.get(`${GET_CHAT_CONVERSATIONS()}?archived=true`)
      set({
        archivedConversations: response.data.data || [],
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
      const newMessages: MessageWithSender[] = response.data.data || []

      set((state) => {
        const existingMessages = state.messages.get(conversationId) || []
        const messageIds = new Set(existingMessages.map((m) => m.id))
        const uniqueNewMessages = newMessages.filter((m: MessageWithSender) => !messageIds.has(m.id))

        const updatedMessages = options.before
          ? [...uniqueNewMessages, ...existingMessages]
          : [...existingMessages, ...uniqueNewMessages]

        const newMessagesMap = new Map(state.messages)
        newMessagesMap.set(conversationId, updatedMessages)

        // Update messageMap for O(1) lookups
        const newMessageMap = new Map(state.messageMap)
        uniqueNewMessages.forEach(msg => newMessageMap.set(msg.cid, msg))

        // Update last message timestamp
        const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
        if (updatedMessages.length > 0) {
          newLastMessageTimestamp[conversationId] = updatedMessages[updatedMessages.length - 1].createdAt
        }

        return {
          messages: newMessagesMap,
          messageMap: newMessageMap,
          lastMessageTimestamp: newLastMessageTimestamp,
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
    // Generate CID for idempotency
    const cid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Validate inputs before sending
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Conversation ID is required')
    }

    // Allow empty content if there are attachments
    const hasAttachments = attachments && attachments.length > 0
    const hasContent = content && typeof content === 'string' && content.trim()
    
    if (!hasContent && !hasAttachments) {
      throw new Error('Message content or attachments are required')
    }
    
    console.log('📤 sendMessage store called:', {
      conversationId,
      content: content || '(empty)',
      hasContent,
      hasAttachments,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments
    })

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'system']
    if (type && !validTypes.includes(type)) {
      throw new Error(`Invalid message type: ${type}. Must be one of: ${validTypes.join(', ')}`)
    }

    // Create optimistic message
    const optimisticMessage: MessageWithSender = {
      id: cid, // Temporary ID until server responds
      cid,
      conversationId,
      senderId: useAuthStore.getState().user?.id || '',
      content: hasContent ? content.trim() : '', // Allow empty content if attachments exist
      type: hasAttachments && !hasContent ? 'image' : (type as any), // Set type to image if only attachments
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

    // Add optimistic message to state
    get().addMessage(conversationId, optimisticMessage)

    try {
      // Emit via socket (will be handled by socket handlers)
      const { socket } = useSocketStore.getState()
      if (socket) {
        const messageType = hasAttachments && !hasContent ? 'image' : (type || 'text')
        const messageContent = hasContent ? content.trim() : ''
        
        console.log('📡 Emitting socket message:', {
          cid,
          content: messageContent || '(empty)',
          type: messageType,
          attachments: attachments?.length || 0,
          hasAttachments,
          hasContent
        })
        
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
      // Mark as error in optimistic update
      get().updateMessageStatus(cid, { status: 'error' })
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
      const existingMessages = state.messages.get(conversationId) || []
      const messageMap = new Map(state.messageMap)

      // Prevent duplicates by CID (idempotency)
      if (messageMap.has(message.cid)) {
        return state
      }

      const newMessages = [...existingMessages, message]
      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, newMessages)

      // Add to messageMap for O(1) lookups
      messageMap.set(message.cid, message)

      // Update last message timestamp
      const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
      newLastMessageTimestamp[conversationId] = message.createdAt

      return {
        messages: newMessagesMap,
        messageMap,
        lastMessageTimestamp: newLastMessageTimestamp,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c
        ),
      }
    })
  },

  updateMessageStatus: (cid: string, updates: Partial<MessageWithSender>) => {
    set((state) => {
      const messageMap = new Map(state.messageMap)
      const existingMessage = messageMap.get(cid)

      if (!existingMessage) {
        return state
      }

      const updatedMessage = { ...existingMessage, ...updates }
      messageMap.set(cid, updatedMessage)

      // Update in conversation messages array
      const conversationId = existingMessage.conversationId
      const messages = state.messages.get(conversationId) || []
      const updatedMessages = messages.map(m =>
        m.cid === cid ? updatedMessage : m
      )

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, updatedMessages)

      return {
        messageMap,
        messages: newMessagesMap,
      }
    })
  },

  syncMessages: (conversationId: string, messages: MessageWithSender[]) => {
    set((state) => {
      const existingMessages = state.messages.get(conversationId) || []
      const messageMap = new Map(state.messageMap)

      // Merge messages, avoiding duplicates by CID
      const mergedMessages = [...existingMessages]
      messages.forEach(msg => {
        if (!messageMap.has(msg.cid)) {
          mergedMessages.push(msg)
          messageMap.set(msg.cid, msg)
        }
      })

      // Sort by createdAt
      mergedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, mergedMessages)

      // Update last message timestamp
      const newLastMessageTimestamp = { ...state.lastMessageTimestamp }
      if (mergedMessages.length > 0) {
        newLastMessageTimestamp[conversationId] = mergedMessages[mergedMessages.length - 1].createdAt
      }

      return {
        messages: newMessagesMap,
        messageMap,
        lastMessageTimestamp: newLastMessageTimestamp,
      }
    })
  },

  removeMessage: (conversationId: string, messageId: string) => {
    set((state) => {
      const messages = state.messages.get(conversationId) || []
      const messageMap = new Map(state.messageMap)

      const updatedMessages = messages.filter((m) => m.id !== messageId)
      const removedMessage = messages.find(m => m.id === messageId)

      // Remove from messageMap if found
      if (removedMessage) {
        messageMap.delete(removedMessage.cid)
      }

      const newMessagesMap = new Map(state.messages)
      newMessagesMap.set(conversationId, updatedMessages)

      return {
        messages: newMessagesMap,
        messageMap,
      }
    })
  },

  getLastMessageTimestamp: (conversationId: string): string | null => {
    return get().lastMessageTimestamp[conversationId] || null
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
          [conversationId]: new Set(typingSet), // Create new Set to trigger reactivity
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

  archiveConversation: async (conversationId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await axiosInstance.post(ARCHIVE_CONVERSATION(conversationId))
      const conversation = response.data.data
      // Remove from conversations list and add to archived list
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
      // Remove from archived list and add back to conversations list
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
      // Remove from conversations list
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
}))
