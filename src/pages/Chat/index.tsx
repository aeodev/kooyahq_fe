import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat.store'
import { useChatConversations, useChatMessages, useChatTyping, useActiveConversation, useChatUnread } from '@/hooks/chat.hooks'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { UnreadBadge } from '@/components/chat/UnreadBadge'
import { TeamContacts } from '@/components/chat/TeamContacts'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ImageUploadButton } from '@/components/chat/ImageUploadButton'
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton'
import { UserSearchModal } from '@/components/chat/UserSearchModal'
import { cn } from '@/utils/cn'
import { format } from 'date-fns'
import { Send, Plus, Users, Settings, MessageCircle } from 'lucide-react'
import type { ConversationWithParticipants, MessageWithSender } from '@/types/chat'

export function Chat() {
  const { user } = useAuthStore()
  const { conversations, loading, sendMessage, setActiveConversation, fetchConversations, fetchMessages } = useChatStore()
  const { conversations: conversationsList, refetch: refetchConversations } = useChatConversations()
  const { activeConversationId, setActiveConversation: setActive } = useActiveConversation()
  const { messages, loadMore } = useChatMessages(activeConversationId)
  const { typingUserIds, startTyping, stopTyping } = useChatTyping(activeConversationId)
  const { getUnreadCount } = useChatUnread()
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTeamContacts, setShowTeamContacts] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ url: string; type: string; name: string; size: number }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async () => {
    // Strict validation - don't send if no content
    if (!activeConversationId) return
    const trimmedContent = messageInput.trim()
    if (!trimmedContent && (!attachments || attachments.length === 0)) return

    try {
      await sendMessage(
        activeConversationId,
        trimmedContent || '', // Only send if we have content or attachments
        'text',
        attachments.length > 0 ? attachments : undefined
      )
      setMessageInput('')
      setAttachments([])
      stopTyping()
      if (messageInputRef.current) {
        messageInputRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleImageUploaded = (url: string, file: File) => {
    setAttachments((prev) => [
      ...prev,
      {
        url,
        type: 'image',
        name: file.name,
        size: file.size,
      },
    ])
  }

  const handleEmojiSelect = (emoji: string) => {
    const input = messageInputRef.current
    if (input) {
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end)
      setMessageInput(newValue)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setMessageInput((prev) => prev + emoji)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (conv.type === 'direct') {
      const otherParticipant = conv.participants.find((p) => p.id !== user?.id)
      return otherParticipant?.name.toLowerCase().includes(query) || otherParticipant?.email.toLowerCase().includes(query)
    }
    return conv.name?.toLowerCase().includes(query) || conv.description?.toLowerCase().includes(query)
  })

  const getConversationDisplayName = (conv: ConversationWithParticipants) => {
    if (conv.type === 'group') {
      return conv.name || 'Group Chat'
    }
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id)
    return otherParticipant?.name || 'Unknown User'
  }

  const getConversationAvatar = (conv: ConversationWithParticipants) => {
    if (conv.type === 'group' && conv.avatar) {
      return conv.avatar
    }
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id)
    return otherParticipant?.profilePic
  }

  return (
    <>
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onStartConversation={async (conversationId) => {
          setShowUserSearch(false)
          // Refresh conversations to ensure the new one is in the list
          await refetchConversations()
          // Set as active
          setActiveConversation(conversationId)
          setActive(conversationId)
          // Fetch messages for the conversation
          await fetchMessages(conversationId)
        }}
      />
      <div className="flex h-full overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 flex flex-col bg-background min-h-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Chat</h2>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", showTeamContacts && "bg-accent")}
                  onClick={() => setShowTeamContacts(!showTeamContacts)}
                  title="Team Contacts"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8" 
                  title="New Conversation"
                  onClick={() => setShowUserSearch(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {!showTeamContacts && (
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            )}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {showTeamContacts ? (
              <TeamContacts
                onStartConversation={async (conversationId) => {
                  setShowTeamContacts(false)
                  // Refresh conversations to ensure the new one is in the list
                  await refetchConversations()
                  // Set as active
                  setActiveConversation(conversationId)
                  setActive(conversationId)
                  // Fetch messages for the conversation
                  await fetchMessages(conversationId)
                }}
              />
            ) : loading && conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </div>
            ) : (
              <div className="overflow-y-auto h-full">
                {filteredConversations.map((conv) => {
                  const unreadCount = getUnreadCount(conv.id)
                  const isActive = conv.id === activeConversationId
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConversation(conv.id)
                        setActive(conv.id)
                      }}
                      className={cn(
                        'w-full p-3 text-left hover:bg-accent/50 transition-colors',
                        isActive && 'bg-accent/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {conv.type === 'group' ? (
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                          ) : (
                            <Avatar
                              src={getConversationAvatar(conv)}
                              name={getConversationDisplayName(conv)}
                              size="md"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{getConversationDisplayName(conv)}</p>
                            {conv.lastMessageAt && (
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                {format(new Date(conv.lastMessageAt), 'h:mm a')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage?.content || 'No messages yet'}
                            </p>
                            {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="flex-1 flex flex-col bg-background min-h-0">
          {activeConversationId && activeConversation ? (
            <>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activeConversation.type === 'group' ? (
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                ) : (
                  <Avatar
                    src={getConversationAvatar(activeConversation)}
                    name={getConversationDisplayName(activeConversation)}
                    size="md"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{getConversationDisplayName(activeConversation)}</h3>
                  {activeConversation.type === 'group' && (
                    <p className="text-xs text-muted-foreground">
                      {activeConversation.participants.length} members
                    </p>
                  )}
                </div>
              </div>
              {activeConversation.type === 'group' && (
                <Button size="icon" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message: MessageWithSender) => {
                  const isOwn = message.senderId === user?.id
                  return (
                    <div key={message.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                      {!isOwn && (
                        <Avatar
                          src={message.sender.profilePic}
                          name={message.sender.name}
                          size="sm"
                        />
                      )}
                      <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
                        {!isOwn && (
                          <span className="text-xs text-muted-foreground mb-1">{message.sender.name}</span>
                        )}
                        <MessageBubble message={message} isOwn={isOwn} />
                        <span className="text-xs text-muted-foreground mt-1 px-1">
                          {format(new Date(message.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              {typingUserIds.length > 0 && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

              {/* Input */}
              <div className="p-4">
              <div className="flex gap-2">
                <Input
                  ref={messageInputRef}
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    if (e.target.value.trim()) {
                      startTyping()
                    } else {
                      stopTyping()
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!messageInput.trim() && attachments.length === 0}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </>
  )
}
