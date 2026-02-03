import { useState } from 'react'
import { useTeamContacts } from '@/hooks/chat.hooks'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { MessageCircle, Search, Users } from 'lucide-react'
import { StatusIndicator } from '@/components/ui/status-indicator'

export function TeamContacts({ onStartConversation }: { onStartConversation?: (conversationId: string) => void }) {
  const { teamContacts, loading } = useTeamContacts()
  const getOrCreateDirectConversation = useChatConversationsStore((state) => state.getOrCreateDirectConversation)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredContacts = teamContacts.filter((contact) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    )
  })

  const [startingConversation, setStartingConversation] = useState<string | null>(null)

  const handleStartConversation = async (userId: string) => {
    if (startingConversation) return // Prevent double-clicks
    
    setStartingConversation(userId)
    try {
      const conversation = await getOrCreateDirectConversation(userId)
      if (conversation?.id) {
        onStartConversation?.(conversation.id)
      }
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      // Error is already logged, the store handles error state
      // Could show a toast notification here if needed
    } finally {
      setStartingConversation(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Team Contacts</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-8 text-sm">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {searchQuery ? 'No contacts found' : 'No team members yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredContacts.map((contact) => {
              const isStarting = startingConversation === contact.id
              return (
              <button
                key={contact.id}
                onClick={() => handleStartConversation(contact.id)}
                disabled={isStarting || !!startingConversation}
                className="w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
                {isStarting ? (
                  <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
