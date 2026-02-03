import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import { useChatMessagesStore } from '@/stores/chat-messages.store'
import { useChatTypingStore } from '@/stores/chat-typing.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useActiveUsersQuery } from '@/hooks/queries/game.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import axiosInstance from '@/utils/axios.instance'
import { GET_CHAT_TEAM_CONTACTS } from '@/utils/api.routes'

type Timeout = ReturnType<typeof setTimeout>

export function useChatConversations() {
  const conversations = useChatConversationsStore((state) => state.conversations)
  const loading = useChatConversationsStore((state) => state.loading)
  const error = useChatConversationsStore((state) => state.error)
  const fetchConversations = useChatConversationsStore((state) => state.fetchConversations)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, loading, error, refetch: fetchConversations }
}

const EMPTY_MESSAGES: never[] = []

export function useChatMessages(conversationId: string | null) {
  const messagesMap = useChatMessagesStore((state) => state.messages)
  const loading = useChatMessagesStore((state) => state.loading)
  const fetchMessages = useChatMessagesStore((state) => state.fetchMessages)
  const fetchedConversations = useChatMessagesStore((state) => state.fetchedConversations)
  const activeConversationId = useChatConversationsStore((state) => state.activeConversationId)

  const messages = useMemo(() => {
    if (!conversationId) return EMPTY_MESSAGES
    return messagesMap.get(conversationId) || EMPTY_MESSAGES
  }, [conversationId, messagesMap])

  const hasFetched = useMemo(() => {
    if (!conversationId) return true
    return fetchedConversations.has(conversationId)
  }, [conversationId, fetchedConversations])

  useEffect(() => {
    if (conversationId && activeConversationId === conversationId && !hasFetched) {
      fetchMessages(conversationId)
    }
  }, [conversationId, activeConversationId, hasFetched, fetchMessages])

  return { messages, loading }
}

export function useChatTyping(conversationId: string | null) {
  const typingUsers = useChatTypingStore((state) => state.typingUsers)
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const typingTimeoutRef = useRef<Timeout | null>(null)

  const startTyping = useCallback(() => {
    if (!conversationId || !socket || !user) return

    socket.emit('chat:typing-start', { conversationId })
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }, [conversationId, socket, user])

  const stopTyping = useCallback(() => {
    if (!conversationId || !socket || !user) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    socket.emit('chat:typing-stop', { conversationId })
  }, [conversationId, socket, user])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      stopTyping()
    }
  }, [stopTyping])

  const typingUserIds = conversationId ? Array.from(typingUsers[conversationId] || []) : []

  return {
    typingUserIds,
    startTyping,
    stopTyping,
  }
}

export function useChatUnread() {
  const unreadCounts = useChatConversationsStore((state) => state.unreadCounts)

  const getUnreadCount = useCallback(
    (conversationId: string) => {
      return unreadCounts[conversationId] || 0
    },
    [unreadCounts]
  )

  const getTotalUnread = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
  }, [unreadCounts])

  return {
    unreadCounts,
    getUnreadCount,
    getTotalUnread,
  }
}

export function useActiveConversation() {
  const activeConversationId = useChatConversationsStore((state) => state.activeConversationId)
  const setActiveConversation = useChatConversationsStore((state) => state.setActiveConversation)
  const markAsRead = useChatConversationsStore((state) => state.markAsRead)
  const getLastMessageTimestamp = useChatMessagesStore((state) => state.getLastMessageTimestamp)
  const socket = useSocketStore((state) => state.socket)

  useEffect(() => {
    if (!socket || !activeConversationId) return

    socket.emit('chat:join', activeConversationId)

    markAsRead(activeConversationId)

    return () => {
      socket.emit('chat:leave', activeConversationId)
    }
  }, [socket, activeConversationId, markAsRead])

  useEffect(() => {
    if (!socket) return

    const handleReconnect = () => {
      if (activeConversationId) {
        const lastSync = getLastMessageTimestamp(activeConversationId)
        socket.emit('get_delta_messages', {
          conversationId: activeConversationId,
          lastSyncTimestamp: lastSync || undefined
        })
      }
    }

    socket.on('reconnect', handleReconnect)

    return () => {
      socket.off('reconnect', handleReconnect)
    }
  }, [socket, activeConversationId, getLastMessageTimestamp])

  return {
    activeConversationId,
    setActiveConversation,
  }
}

export function useTeamContacts() {
  const [teamContacts, setTeamContacts] = useState<Array<{
    id: string
    name: string
    email: string
    profilePic?: string
    status?: string
  }>>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const { data: activeUsers = [] } = useActiveUsersQuery()
  const { data: allUsers = [] } = useUsersQuery()

  const activeUsersMap = useMemo(() => {
    const map = new Map<string, boolean>()
    activeUsers.forEach((activeUser) => {
      map.set(activeUser.id, true)
    })
    return map
  }, [activeUsers])

  const usersMap = useMemo(() => {
    const map = new Map<string, { status?: string }>()
    allUsers.forEach((u) => {
      map.set(u.id, { status: u.status })
    })
    return map
  }, [allUsers])

  useEffect(() => {
    const fetchTeamContacts = async () => {
      setLoading(true)
      try {
        const response = await axiosInstance.get(GET_CHAT_TEAM_CONTACTS())
        const contacts = response.data.data || []
        const filteredContacts = contacts.filter((contact: any) => contact.id !== user?.id)
        setTeamContacts(filteredContacts)
      } catch (error) {
        console.error('Failed to fetch team contacts:', error)
        setTeamContacts([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeamContacts()
  }, [user?.id])

  const contactsWithStatus = useMemo(() => {
    return teamContacts.map((contact) => {
      const isOnline = activeUsersMap.get(contact.id) || false
      const userData = usersMap.get(contact.id)
      
      let status: 'online' | 'busy' | 'away' | 'offline' = 'offline'
      
      if (isOnline) {
        status = (userData?.status as 'online' | 'busy' | 'away' | 'offline') || 'online'
      } else {
        status = 'offline'
      }

      return {
        ...contact,
        status,
      }
    }).sort((a, b) => {
      if (a.status !== 'offline' && b.status === 'offline') return -1
      if (a.status === 'offline' && b.status !== 'offline') return 1
      return a.name.localeCompare(b.name)
    })
  }, [teamContacts, activeUsersMap, usersMap])

  return {
    teamContacts: contactsWithStatus,
    loading,
  }
}
