import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat.store'
import { useChatConversations, useChatMessages, useChatTyping, useActiveConversation, useChatUnread } from '@/hooks/chat.hooks'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { UnreadBadge } from '@/components/chat/UnreadBadge'
import { cn } from '@/utils/cn'
import { format } from 'date-fns'
import { MessageCircle, X, Minimize2, Send, Users, ChevronLeft } from 'lucide-react'
import type { ConversationWithParticipants, MessageWithSender } from '@/types/chat'

export function ChatWidget() {
  const { user } = useAuthStore()
  const { conversations, sendMessage, setActiveConversation } = useChatStore()
  const { conversations: conversationsList } = useChatConversations()
  const { activeConversationId, setActiveConversation: setActive } = useActiveConversation()
  const { messages } = useChatMessages(activeConversationId)
  const { typingUserIds, startTyping, stopTyping } = useChatTyping(activeConversationId)
  const { getTotalUnread, getUnreadCount } = useChatUnread()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const totalUnread = getTotalUnread()
  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    if (messagesEndRef.current && view === 'chat') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  const handleSendMessage = async () => {
    if (!activeConversationId || !messageInput.trim()) return

    try {
      await sendMessage(activeConversationId, messageInput.trim())
      setMessageInput('')
      stopTyping()
      if (messageInputRef.current) {
        messageInputRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const openConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    setActive(conversationId)
    setView('chat')
  }

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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl transition-all duration-300',
        isMinimized ? 'h-16 w-80' : 'h-[600px] w-96'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20 rounded-t-2xl bg-card/50">
        <div className="flex items-center gap-2">
          {view === 'chat' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setView('list')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">
            {view === 'chat' && activeConversation
              ? getConversationDisplayName(activeConversation)
              : 'Chat'}
          </h3>
          {totalUnread > 0 && view === 'list' && <UnreadBadge count={totalUnread} />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setIsMinimized(!isMinimized)
              if (isMinimized) {
                setView('list')
              }
            }}
          >
            {isMinimized ? <MessageCircle className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setIsOpen(false)
              setIsMinimized(false)
              setView('list')
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {view === 'list' ? (
            /* Conversation List */
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">No conversations yet</div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const unreadCount = getUnreadCount(conv.id)
                    return (
                      <button
                        key={conv.id}
                        onClick={() => openConversation(conv.id)}
                        className="w-full p-3 text-left hover:bg-accent/50 transition-colors rounded-xl"
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
                              {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
                            </div>
                            {conv.lastMessageAt && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {conv.lastMessage?.content || 'No messages yet'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Chat View */
            activeConversation && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message: MessageWithSender) => {
                      const isOwn = message.senderId === user?.id
                      return (
                        <div key={message.id} className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
                          {!isOwn && (
                            <Avatar
                              src={message.sender.profilePic}
                              name={message.sender.name}
                              size="sm"
                            />
                          )}
                          <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
                            {!isOwn && (
                              <span className="text-[10px] text-muted-foreground mb-0.5">{message.sender.name}</span>
                            )}
                            <div
                              className={cn(
                                'rounded-xl px-3 py-2 text-sm shadow-sm',
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
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
                <div className="p-3 border-t border-border/20">
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
                      className="flex-1 text-sm h-9"
                    />
                    <Button onClick={handleSendMessage} disabled={!messageInput.trim()} size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </>
      )}
    </div>
  )
}
