import { useState, useEffect, useRef, useMemo } from 'react'
import { useChatStore } from '@/stores/chat.store'
import axiosInstance from '@/utils/axios.instance'
import { GET_USERS } from '@/utils/api.routes'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { X, Search, MessageCircle } from 'lucide-react'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { useAuthStore } from '@/stores/auth.store'
import { useActiveUsersQuery } from '@/hooks/queries/game.queries'
import { useUsersQuery } from '@/hooks/queries/user.queries'

interface User {
  id: string
  name: string
  email: string
  profilePic?: string
  status?: string
}

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onStartConversation: (conversationId: string) => void
}

export function UserSearchModal({ isOpen, onClose, onStartConversation }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const { getOrCreateDirectConversation } = useChatStore()
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const { data: activeUsers = [] } = useActiveUsersQuery()
  const { data: allUsers = [] } = useUsersQuery()

  // Create a map of active users for quick lookup (same logic as TeamContacts)
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

  // Merge users with real-time status from active users (same logic as TeamContacts)
  const usersWithStatus = useMemo(() => {
    return users.map((contact) => {
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
  }, [users, activeUsersMap, usersMap])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setUsers([])
      return
    }

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim())
        }
        params.append('limit', '50')

        const response = await axiosInstance.get<{ status: string; data: User[] | { data: User[]; pagination: any } }>(
          `${GET_USERS()}?${params.toString()}`
        )
        
        // Handle both paginated and non-paginated responses
        let usersList: User[] = []
        if (Array.isArray(response.data.data)) {
          usersList = response.data.data
        } else if (response.data.data && typeof response.data.data === 'object' && 'data' in response.data.data) {
          usersList = (response.data.data as { data: User[] }).data
        }
        
        // Filter out current user
        const filteredUsers = usersList.filter((u) => u.id !== user?.id)
        
        setUsers(filteredUsers)
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    // If search query is empty, fetch immediately (no debounce for initial load)
    if (!searchQuery.trim()) {
      fetchUsers()
      return
    }

    // Debounce search when user is typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers()
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isOpen, user?.id])

  const handleStartConversation = async (userId: string) => {
    try {
      const conversation = await getOrCreateDirectConversation(userId)
      onStartConversation(conversation.id)
      onClose()
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <h3 className="font-semibold">Start New Conversation</h3>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Searching...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {searchQuery ? 'No users found' : 'Start typing to search for users'}
            </div>
          ) : (
            <div className="space-y-1">
              {usersWithStatus.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartConversation(contact.id)}
                  className="w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-xl flex items-center gap-3"
                >
                  <div className="relative">
                    <Avatar src={contact.profilePic} name={contact.name} size="md" />
                    <StatusIndicator
                      status={(contact.status || 'offline') as 'online' | 'busy' | 'away' | 'offline'}
                      className="absolute bottom-0 right-0"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
