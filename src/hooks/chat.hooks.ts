import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useChatStore } from '@/stores/chat.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useActiveUsersQuery } from '@/hooks/queries/game.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import axiosInstance from '@/utils/axios.instance'
import { GET_CHAT_TEAM_CONTACTS } from '@/utils/api.routes'

type Timeout = ReturnType<typeof setTimeout>

/**
 * Hook to fetch and manage chat conversations
 */
export function useChatConversations() {
  const { conversations, loading, error, fetchConversations } = useChatStore()

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  }
}

/**
 * Hook to manage messages for a specific conversation
 */
export function useChatMessages(conversationId: string | null) {
  const { messages, loading, fetchMessages, activeConversationId } = useChatStore()
  const messagesList = conversationId ? messages.get(conversationId) || [] : []

  const loadMore = useCallback(
    (before?: string) => {
      if (!conversationId) return
      fetchMessages(conversationId, { before })
    },
    [conversationId, fetchMessages]
  )

  useEffect(() => {
    if (conversationId && activeConversationId === conversationId && messagesList.length === 0) {
      fetchMessages(conversationId)
    }
  }, [conversationId, activeConversationId, messagesList.length, fetchMessages])

  return {
    messages: messagesList,
    loading,
    loadMore,
  }
}

/**
 * Hook to handle typing indicators
 */
export function useChatTyping(conversationId: string | null) {
  const { typingUsers } = useChatStore()
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const typingTimeoutRef = useRef<Timeout | null>(null)

  const startTyping = useCallback(() => {
    if (!conversationId || !socket || !user) return

    socket.emit('chat:typing-start', { conversationId })
    
    // Auto-stop typing after 3 seconds
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

/**
 * Hook to get unread counts
 */
export function useChatUnread() {
  const { unreadCounts } = useChatStore()

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

/**
 * Hook to manage active conversation and socket room
 */
export function useActiveConversation() {
  const { activeConversationId, setActiveConversation, markAsRead, getLastMessageTimestamp } = useChatStore()
  const socket = useSocketStore((state) => state.socket)

  useEffect(() => {
    if (!socket || !activeConversationId) return

    // Join conversation room
    socket.emit('chat:join', activeConversationId)

    // Mark as read
    markAsRead(activeConversationId)

    return () => {
      // Leave conversation room on cleanup
      socket.emit('chat:leave', activeConversationId)
    }
  }, [socket, activeConversationId, markAsRead])

  // Handle reconnection sync
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

/**
 * Hook to fetch team contacts for chat with real-time status from active users (same as sidebar)
 */
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

  // Create a map of active users for quick lookup (same logic as sidebar)
  const activeUsersMap = useMemo(() => {
    const map = new Map<string, boolean>()
    activeUsers.forEach((activeUser) => {
      map.set(activeUser.id, true)
    })
    return map
  }, [activeUsers])

  // Create a map of all users for status lookup
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
        // Filter out current user
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

  // Merge contacts with real-time status from active users (same logic as sidebar)
  const contactsWithStatus = useMemo(() => {
    return teamContacts.map((contact) => {
      const isOnline = activeUsersMap.get(contact.id) || false
      const userData = usersMap.get(contact.id)
      
      // Determine status: if user is in activeUsers, they're online (or use their status preference), otherwise offline
      let status: 'online' | 'busy' | 'away' | 'offline' = 'offline'
      
      if (isOnline) {
        // If online, use their status preference, default to 'online'
        status = (userData?.status as 'online' | 'busy' | 'away' | 'offline') || 'online'
      } else {
        // Always show offline status explicitly
        status = 'offline'
      }

      return {
        ...contact,
        status,
      }
    }).sort((a, b) => {
      // Sort: online users first, then by name
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
