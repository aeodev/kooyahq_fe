import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat.store'
import { useChatConversations, useChatMessages, useChatTyping, useActiveConversation, useChatUnread } from '@/hooks/chat.hooks'
import { useAuthStore } from '@/stores/auth.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { UnreadBadge } from '@/components/chat/UnreadBadge'
import { TeamContacts } from '@/components/chat/TeamContacts'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ImageUploadButton } from '@/components/chat/ImageUploadButton'
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton'
import { UserSearchModal } from '@/components/chat/UserSearchModal'
import { cn } from '@/utils/cn'
import { format, isToday, isYesterday } from 'date-fns'
import { Send, Plus, Users, Settings, MessageCircle, ArrowLeft, Archive, Trash2, MoreVertical, ArchiveRestore, X, Search, ChevronDown, Pin, BellOff, User, Download, Ban, Eye } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ConversationWithParticipants, MessageWithSender } from '@/types/chat'

export function Chat() {
  const { user } = useAuthStore()
  const { conversations, archivedConversations, loading, loadingArchived, archivedFetched, sendMessage, setActiveConversation, fetchArchivedConversations, fetchMessages, archiveConversation, unarchiveConversation, deleteConversation } = useChatStore()
  const { refetch: refetchConversations } = useChatConversations()
  const { activeConversationId, setActiveConversation: setActive } = useActiveConversation()
  const { messages } = useChatMessages(activeConversationId)
  const { typingUserIds, startTyping, stopTyping } = useChatTyping(activeConversationId)
  const { getUnreadCount } = useChatUnread()
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'teams' | 'archived'>('messages')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ url: string; type: string; name: string; size: number; uploading?: boolean; previewUrl?: string }>>([])
  const [showConversationList, setShowConversationList] = useState(true) // Mobile: show conversation list by default
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null)
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set())
  const [mutedConversations, setMutedConversations] = useState<Record<string, { until?: string; duration: '8h' | '1w' | 'always' }>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle mobile navigation: hide conversation list when viewing messages
  useEffect(() => {
    if (activeConversationId) {
      // On mobile, when we have an active conversation, hide the conversation list
      const isMobile = window.innerWidth < 768 // md breakpoint
      if (isMobile) {
        setShowConversationList(false)
      }
    } else {
      // No active conversation, show conversation list
      setShowConversationList(true)
    }
  }, [activeConversationId])

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called', { activeConversationId, attachments })
    
    // Don't send if no content and no attachments
    if (!activeConversationId) {
      console.log('❌ No active conversation')
      return
    }
    
    const trimmedContent = messageInput.trim()
    
    // Only count attachments that have finished uploading (have a URL)
    const readyAttachments = attachments.filter(att => att.url && !att.uploading)
    const hasAttachments = readyAttachments.length > 0
    
    console.log('📊 Send check:', {
      trimmedContent,
      totalAttachments: attachments.length,
      readyAttachmentsCount: readyAttachments.length,
      allAttachments: attachments.map(att => ({ url: att.url, uploading: att.uploading, name: att.name })),
      readyAttachmentsList: readyAttachments.map(att => ({ url: att.url, name: att.name }))
    })
    
    // Allow sending if there's content OR ready attachments
    if (!trimmedContent && !hasAttachments) {
      console.log('❌ No content and no ready attachments')
      return
    }

    console.log('✅ Sending message with:', {
      content: trimmedContent || '(empty)',
      attachments: readyAttachments.length,
      attachmentDetails: readyAttachments
    })

    try {
      // Only send content if it exists, otherwise send empty string for image-only messages
      const contentToSend = hasAttachments && !trimmedContent ? '' : trimmedContent
      
      await sendMessage(
        activeConversationId,
        contentToSend,
        'text',
        hasAttachments ? readyAttachments : undefined
      )
      console.log('✅ Message sent successfully')
      setMessageInput('')
      setAttachments([])
      stopTyping()
      if (messageInputRef.current) {
        messageInputRef.current.focus()
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error)
    }
  }

  const handleImageSelect = (file: File) => {
    console.log('📸 Image selected:', { name: file.name, size: file.size, type: file.type })
    // Create preview immediately
    const previewUrl = URL.createObjectURL(file)
    setAttachments((prev) => {
      const newAttachments = [
        ...prev,
        {
          url: '', // Will be set when upload completes
          type: 'image',
          name: file.name,
          size: file.size,
          uploading: true,
          previewUrl,
        },
      ]
      console.log('📎 Attachments updated (select):', newAttachments.length, newAttachments)
      return newAttachments
    })
  }

  const handleImageUploaded = (url: string, file: File) => {
    console.log('✅ Image uploaded:', { url, fileName: file.name })
    // Update the uploading attachment with the final URL
    setAttachments((prev) => {
      const updated = prev.map((att) => {
        // Find the uploading attachment that matches this file
        if (att.uploading && att.previewUrl && att.name === file.name) {
          // Clean up preview URL
          URL.revokeObjectURL(att.previewUrl)
          const updatedAtt = { ...att, url, uploading: false, previewUrl: undefined }
          console.log('📎 Attachment updated (uploaded):', updatedAtt)
          return updatedAtt
        }
        return att
      })
      console.log('📎 All attachments after upload:', updated)
      return updated
    })
    // Focus input after image is added
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }

  const handleImageUploadError = (file: File) => {
    // Remove the failed upload attachment
    setAttachments((prev) => {
      const updated = prev.filter((att) => {
        if (att.uploading && att.name === file.name && att.previewUrl) {
          URL.revokeObjectURL(att.previewUrl)
          return false
        }
        return true
      })
      return updated
    })
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

  const filteredConversations = (activeTab === 'archived' ? archivedConversations : conversations).filter((conv) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (conv.type === 'direct') {
      const otherParticipant = conv.participants.find((p) => p.id !== user?.id)
      return otherParticipant?.name.toLowerCase().includes(query) || otherParticipant?.email.toLowerCase().includes(query)
    }
    return conv.name?.toLowerCase().includes(query) || conv.description?.toLowerCase().includes(query)
  })

  useEffect(() => {
    if (activeTab === 'archived' && !archivedFetched && !loadingArchived) {
      fetchArchivedConversations()
    }
  }, [activeTab, archivedFetched, loadingArchived, fetchArchivedConversations])

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

  const formatConversationTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isToday(date)) {
      return format(date, 'h:mm a')
    }
    if (isYesterday(date)) {
      return 'Yesterday'
    }
    return format(date, 'MMM d')
  }

  const handleMarkAsUnread = (conversationId: string) => {
    // Increment unread count
    const currentCount = getUnreadCount(conversationId)
    useChatStore.getState().updateUnreadCount(conversationId, currentCount + 1)
  }

  const handlePinConversation = (conversationId: string) => {
    setPinnedConversations((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId)
      } else {
        newSet.add(conversationId)
      }
      return newSet
    })
  }

  const handleMuteConversation = (conversationId: string, duration: '8h' | '1w' | 'always') => {
    setMutedConversations((prev) => {
      const until = duration === '8h' 
        ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        : duration === '1w'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined
      
      return {
        ...prev,
        [conversationId]: { until, duration }
      }
    })
  }

  const handleClearChat = async (conversationId: string) => {
    if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
      // Clear messages from store
      const messages = useChatStore.getState().messages
      messages.delete(conversationId)
      useChatStore.setState({ messages: new Map(messages) })
    }
  }

  const handleExportChat = (conversationId: string) => {
    const messages = useChatStore.getState().messages.get(conversationId) || []
    const conversation = conversations.find(c => c.id === conversationId)
    const content = messages.map(msg => {
      const date = format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')
      return `[${date}] ${msg.sender.name}: ${msg.content}`
    }).join('\n\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${getConversationDisplayName(conversation!)} - ${format(new Date(), 'MMM d, yyyy')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCloseChat = () => {
    setActiveConversation(null)
    setActive(null)
  }

  const isPinned = (conversationId: string) => pinnedConversations.has(conversationId)
  const isMuted = (conversationId: string) => {
    const muteInfo = mutedConversations[conversationId]
    if (!muteInfo) return false
    if (muteInfo.duration === 'always') return true
    if (muteInfo.until) {
      return new Date(muteInfo.until) > new Date()
    }
    return false
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
          // On mobile, hide conversation list to show messages
          setShowConversationList(false)
        }}
      />
      <div className="flex h-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        {/* Conversation List - Hidden on mobile when viewing messages */}
        <div className={cn(
          "flex flex-col bg-card/50 backdrop-blur-sm border-r border-border/50 min-h-0 transition-all duration-300 shadow-sm",
          // Desktop: always show, fixed width
          "hidden md:flex md:w-72",
          // Mobile: show when showConversationList is true, full width
          showConversationList && "flex w-full md:w-72"
        )}>
          {/* Header */}
          <div className="p-3 border-b border-border/50 bg-card/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Messages
                </h2>
              </div>
              {activeTab === 'messages' && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200" 
                  title="New Conversation"
                  onClick={() => setShowUserSearch(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as 'messages' | 'teams' | 'archived')
              setSearchQuery('')
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3 bg-muted/50 p-0.5 rounded-lg h-8">
                <TabsTrigger value="messages" className="rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Messages
                </TabsTrigger>
                <TabsTrigger value="teams" className="rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Teams
                </TabsTrigger>
                <TabsTrigger value="archived" className="rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Archived
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab !== 'teams' && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={activeTab === 'archived' ? "Search archived..." : "Search conversations..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 h-8 rounded-lg bg-background/50 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'teams' ? (
              <TeamContacts
                onStartConversation={async (conversationId) => {
                  setActiveTab('messages')
                  // Refresh conversations to ensure the new one is in the list
                  await refetchConversations()
                  // Set as active
                  setActiveConversation(conversationId)
                  setActive(conversationId)
                  // Fetch messages for the conversation
                  await fetchMessages(conversationId)
                  // On mobile, hide conversation list to show messages
                  setShowConversationList(false)
                }}
              />
            ) : (activeTab === 'archived' ? (loadingArchived && !archivedFetched) : (loading && conversations.length === 0)) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="h-10 w-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Loading conversations...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                  <MessageCircle className="h-10 w-10 text-primary/40" />
                </div>
                <p className="text-base font-semibold text-foreground mb-1.5">
                  {searchQuery 
                    ? 'No conversations found' 
                    : activeTab === 'archived'
                      ? 'No archived conversations' 
                      : 'No conversations yet'}
                </p>
                {activeTab === 'messages' && !searchQuery && (
                  <p className="text-sm text-muted-foreground">Click the + button to start a new conversation</p>
                )}
                {activeTab === 'archived' && !searchQuery && (
                  <p className="text-sm text-muted-foreground">Archived conversations will appear here</p>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto h-full">
                <div className="p-1 space-y-0.5">
                  {filteredConversations
                    .sort((a, b) => {
                      // Sort pinned conversations first
                      const aPinned = isPinned(a.id)
                      const bPinned = isPinned(b.id)
                      if (aPinned && !bPinned) return -1
                      if (!aPinned && bPinned) return 1
                      // Then sort by last message time
                      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
                      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
                      return bTime - aTime
                    })
                    .map((conv) => {
                      const unreadCount = getUnreadCount(conv.id)
                      const isActive = conv.id === activeConversationId
                      const isHovered = hoveredConversationId === conv.id
                      const pinned = isPinned(conv.id)
                      const muted = isMuted(conv.id)
                      return (
                        <div
                          key={conv.id}
                          className="relative group"
                          onMouseEnter={() => setHoveredConversationId(conv.id)}
                          onMouseLeave={() => setHoveredConversationId(null)}
                        >
                          <button
                            onClick={() => {
                              setActiveConversation(conv.id)
                              setActive(conv.id)
                              // On mobile, hide conversation list to show messages
                              setShowConversationList(false)
                            }}
                            className={cn(
                              'w-full p-2 text-left transition-all duration-200 rounded-lg',
                              'hover:bg-accent/50 active:scale-[0.98]',
                              isActive 
                                ? 'bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm border border-primary/20' 
                                : 'hover:shadow-sm'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative flex-shrink-0">
                                {conv.type === 'group' ? (
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-background">
                                    <Users className="h-5 w-5 text-primary" />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Avatar
                                      src={getConversationAvatar(conv)}
                                      name={getConversationDisplayName(conv)}
                                      size="sm"
                                      className="ring-1 ring-background"
                                    />
                                    {unreadCount > 0 && activeTab === 'messages' && (
                                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary ring-1 ring-background flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    {pinned && (
                                      <Pin className="h-3 w-3 text-primary flex-shrink-0" fill="currentColor" />
                                    )}
                                    {muted && (
                                      <BellOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <p className={cn(
                                      "font-medium text-xs truncate",
                                      isActive ? "text-foreground" : "text-foreground/90",
                                      unreadCount > 0 && activeTab === 'messages' && "font-semibold"
                                    )}>
                                      {getConversationDisplayName(conv)}
                                    </p>
                                  </div>
                                  <div className="relative flex items-center gap-1 flex-shrink-0 min-w-[50px]">
                                    {conv.lastMessageAt && (
                                      <span className={cn(
                                        "text-[10px] whitespace-nowrap transition-transform duration-200",
                                        "group-hover:-translate-x-5",
                                        unreadCount > 0 && activeTab === 'messages' 
                                          ? "text-primary font-medium" 
                                          : "text-muted-foreground"
                                      )}>
                                        {formatConversationTime(conv.lastMessageAt)}
                                      </span>
                                    )}
                                    {/* WhatsApp-style dropdown trigger */}
                                    {activeTab !== 'archived' && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            className={cn(
                                              "absolute right-0 h-4 w-4 flex items-center justify-center rounded transition-all",
                                              "opacity-0 group-hover:opacity-100 translate-x-0",
                                              "hover:bg-accent/80 text-muted-foreground hover:text-foreground",
                                              isHovered && "opacity-100"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent 
                                          align="end" 
                                          className="w-56 rounded-xl shadow-lg border-border/50 bg-card/95 backdrop-blur-md"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {isActive && (
                                            <>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleCloseChat()
                                                }}
                                                className="rounded-lg cursor-pointer"
                                              >
                                                <X className="h-4 w-4 mr-2" />
                                                Close Chat
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                            </>
                                          )}
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleMarkAsUnread(conv.id)
                                            }}
                                            className="rounded-lg cursor-pointer"
                                          >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Mark as unread
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              try {
                                                await archiveConversation(conv.id)
                                                if (isActive) {
                                                  setActiveConversation(null)
                                                  setActive(null)
                                                }
                                              } catch (error) {
                                                console.error('Failed to archive conversation:', error)
                                              }
                                            }}
                                            className="rounded-lg cursor-pointer"
                                          >
                                            <Archive className="h-4 w-4 mr-2" />
                                            Archive
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handlePinConversation(conv.id)
                                            }}
                                            className="rounded-lg cursor-pointer"
                                          >
                                            <Pin className={cn("h-4 w-4 mr-2", pinned && "fill-current")} />
                                            {pinned ? 'Unpin' : 'Pin'}
                                          </DropdownMenuItem>
                                          {conv.type === 'direct' && (
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                // TODO: Implement block user
                                                alert('Block user feature coming soon')
                                              }}
                                              className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                                            >
                                              <Ban className="h-4 w-4 mr-2" />
                                              Block {getConversationDisplayName(conv)}
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSub>
                                            <DropdownMenuSubTrigger 
                                              className="rounded-lg cursor-pointer"
                                              onSelect={(e) => e.preventDefault()}
                                            >
                                              <BellOff className="h-4 w-4 mr-2" />
                                              Mute
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent 
                                              className="w-40 rounded-xl shadow-lg border-border/50 bg-card/95 backdrop-blur-md ml-1"
                                            >
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleMuteConversation(conv.id, '8h')
                                                }}
                                                className="rounded-lg cursor-pointer"
                                              >
                                                8 hours
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleMuteConversation(conv.id, '1w')
                                                }}
                                                className="rounded-lg cursor-pointer"
                                              >
                                                1 week
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleMuteConversation(conv.id, 'always')
                                                }}
                                                className="rounded-lg cursor-pointer"
                                              >
                                                Always
                                              </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                          </DropdownMenuSub>
                                          {conv.type === 'direct' && (
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                // TODO: Show contact info modal
                                                alert('Contact info feature coming soon')
                                              }}
                                              className="rounded-lg cursor-pointer"
                                            >
                                              <User className="h-4 w-4 mr-2" />
                                              Contact info
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleExportChat(conv.id)
                                            }}
                                            className="rounded-lg cursor-pointer"
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export chat
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
                                                await handleClearChat(conv.id)
                                              }
                                            }}
                                            className="rounded-lg cursor-pointer"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Clear chat
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                                                try {
                                                  await deleteConversation(conv.id)
                                                  if (isActive) {
                                                    setActiveConversation(null)
                                                    setActive(null)
                                                  }
                                                } catch (error) {
                                                  console.error('Failed to delete conversation:', error)
                                                }
                                              }
                                            }}
                                            className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete chat
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                    {activeTab === 'archived' && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          try {
                                            await unarchiveConversation(conv.id)
                                          } catch (error) {
                                            console.error('Failed to unarchive conversation:', error)
                                          }
                                        }}
                                        title="Unarchive"
                                      >
                                        <ArchiveRestore className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <p className={cn(
                                    "text-[11px] truncate flex-1",
                                    unreadCount > 0 && activeTab === 'messages'
                                      ? "text-foreground font-medium"
                                      : "text-muted-foreground"
                                  )}>
                                    {conv.lastMessage?.content || 'No messages yet'}
                                  </p>
                                  {activeTab === 'messages' && unreadCount > 0 && (
                                    <div className="flex-shrink-0">
                                      <UnreadBadge count={unreadCount} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message View - Hidden on mobile when showing conversation list */}
        <div className={cn(
          "flex-1 flex flex-col bg-background min-h-0",
          // Desktop: always show
          "hidden md:flex",
          // Mobile: show when not showing conversation list
          !showConversationList && "flex"
        )}>
          {activeConversationId && activeConversation ? (
            <>
              {/* Header */}
              <div className="p-2.5 border-b border-border/50 bg-card/80 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2">
                  {/* Mobile back button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="md:hidden flex-shrink-0 h-8 w-8 rounded-lg hover:bg-accent/50 transition-all"
                    onClick={() => setShowConversationList(true)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Avatar */}
                  {activeConversation.type === 'group' ? (
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-background">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <Avatar
                      src={getConversationAvatar(activeConversation)}
                      name={getConversationDisplayName(activeConversation)}
                      size="sm"
                      className="flex-shrink-0 ring-1 ring-background"
                    />
                  )}
                  
                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate text-foreground">
                      {getConversationDisplayName(activeConversation)}
                    </h3>
                    {activeConversation.type === 'group' && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {activeConversation.participants.length} {activeConversation.participants.length === 1 ? 'member' : 'members'}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {activeConversation.type === 'group' && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 rounded-lg hover:bg-accent/50 transition-all"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-lg hover:bg-accent/50 transition-all"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/50">
                        <DropdownMenuItem
                          onClick={async () => {
                            if (activeConversationId) {
                              try {
                                await archiveConversation(activeConversationId)
                                setActiveConversation(null)
                                setActive(null)
                              } catch (error) {
                                console.error('Failed to archive conversation:', error)
                              }
                            }
                          }}
                          className="rounded-lg cursor-pointer"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            if (activeConversationId && confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                              try {
                                await deleteConversation(activeConversationId)
                                setActiveConversation(null)
                                setActive(null)
                              } catch (error) {
                                console.error('Failed to delete conversation:', error)
                              }
                            }
                          }}
                          className="text-destructive focus:text-destructive rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-gradient-to-b from-background to-muted/10">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3">
                    <MessageCircle className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">No messages yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm">Start the conversation by sending a message below</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message: MessageWithSender, index) => {
                    const isOwn = message.senderId === user?.id
                    const prevMessage = index > 0 ? messages[index - 1] : null
                    const showAvatar = !isOwn && (!prevMessage || prevMessage.senderId !== message.senderId)
                    const showTime = !prevMessage || 
                      Math.abs(new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 5 * 60 * 1000
                    
                    return (
                      <div key={message.id}>
                        {showTime && (
                          <div className="flex items-center justify-center my-3">
                            <div className="px-2 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground font-medium">
                              {isToday(new Date(message.createdAt)) 
                                ? `Today at ${format(new Date(message.createdAt), 'h:mm a')}`
                                : isYesterday(new Date(message.createdAt))
                                ? `Yesterday at ${format(new Date(message.createdAt), 'h:mm a')}`
                                : format(new Date(message.createdAt), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        )}
                        <div className={cn('flex gap-2 items-end', isOwn && 'flex-row-reverse')}>
                          {!isOwn && (
                            <div className="flex-shrink-0 w-7">
                              {showAvatar ? (
                                <Avatar
                                  src={message.sender.profilePic}
                                  name={message.sender.name}
                                  size="sm"
                                  className="ring-1 ring-background"
                                />
                              ) : (
                                <div className="h-7 w-7" />
                              )}
                            </div>
                          )}
                          <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
                            {!isOwn && showAvatar && (
                              <span className="text-[10px] text-muted-foreground mb-1 px-1 font-medium">
                                {message.sender.name}
                              </span>
                            )}
                            <MessageBubble message={message} isOwn={isOwn} />
                            <span className="text-[10px] mt-0.5 px-1 text-muted-foreground/60">
                              {format(new Date(message.createdAt), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {typingUserIds.length > 0 && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

              {/* Input */}
              <div className="p-2 border-t border-border/50 bg-card/80 backdrop-blur-md shadow-lg">
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((attachment, idx) => {
                      const imageUrl = attachment.previewUrl || attachment.url
                      const isReady = attachment.url && !attachment.uploading
                      return (
                        <div key={idx} className="relative group">
                          {attachment.type === 'image' && (
                            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border shadow-md bg-muted/50">
                              <img src={imageUrl} alt={attachment.name} className="w-full h-full object-cover" />
                              {attachment.uploading && (
                                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span className="text-[10px] text-muted-foreground font-medium">Uploading...</span>
                                  </div>
                                </div>
                              )}
                              {isReady && (
                                <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary/90 flex items-center justify-center">
                                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                onClick={() => {
                                  console.log('🗑️ Removing attachment:', idx, attachment.name)
                                  // Clean up preview URL if exists
                                  if (attachment.previewUrl) {
                                    URL.revokeObjectURL(attachment.previewUrl)
                                  }
                                  setAttachments(attachments.filter((_, i) => i !== idx))
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-end gap-1.5 border border-border/50 rounded-lg bg-background/50 backdrop-blur-sm shadow-sm focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                    <div className="flex items-center gap-0.5 px-2 py-1">
                      <EmojiPickerButton onEmojiSelect={handleEmojiSelect} />
                      <ImageUploadButton 
                        onImageUploaded={handleImageUploaded} 
                        onImageSelect={handleImageSelect}
                        onUploadError={handleImageUploadError}
                      />
                    </div>
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
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(() => {
                      const trimmedContent = messageInput.trim()
                      // Only count attachments that have finished uploading (have a URL)
                      const readyAttachments = attachments.filter(att => att.url && !att.uploading)
                      const isDisabled = !trimmedContent && readyAttachments.length === 0
                      console.log('🔘 Send button state:', {
                        trimmedContent,
                        totalAttachments: attachments.length,
                        readyAttachmentsCount: readyAttachments.length,
                        isDisabled,
                        attachments: attachments.map(att => ({ url: att.url, uploading: att.uploading }))
                      })
                      return isDisabled
                    })()}
                    type="button"
                    size="sm"
                    className="h-9 px-3 flex-shrink-0 gap-1.5 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs font-medium">Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
              <div className="text-center max-w-md">
                <div className="h-28 w-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <MessageCircle className="h-14 w-14 text-primary/40" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-foreground">No conversation selected</h3>
                <p className="text-sm md:text-base mb-8 text-muted-foreground">
                  Choose a conversation from the list to start chatting, or create a new one
                </p>
                {/* Mobile: Show button to go back to conversation list */}
                <Button
                  variant="outline"
                  onClick={() => setShowConversationList(true)}
                  className="md:hidden rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  View Conversations
                </Button>
                {/* Desktop: Show new conversation button */}
                <Button
                  onClick={() => setShowUserSearch(true)}
                  className="hidden md:flex rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
