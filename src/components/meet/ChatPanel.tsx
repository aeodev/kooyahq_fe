import { useState, useRef, useEffect } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ChatPanelProps {
  meetId: string
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ meetId, isOpen, onClose }: ChatPanelProps) {
  const socket = useSocketStore((state) => state.socket)
  const user = useAuthStore((state) => state.user)
  const chatMessages = useMeetStore((state) => state.chatMessages)
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Store stable reference to addChatMessage
  const storeRef = useRef(useMeetStore.getState())
  useEffect(() => {
    storeRef.current = useMeetStore.getState()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  useEffect(() => {
    if (!socket?.connected || !meetId) return

    const handleChatMessage = (data: { userId: string; userName?: string; message: string; timestamp: string }) => {
      storeRef.current.addChatMessage({
        userId: data.userId,
        userName: data.userId === user?.id ? user.name : data.userName,
        message: data.message,
        timestamp: data.timestamp,
      })
    }

    socket.on('meet:chat-message', handleChatMessage)

    return () => {
      socket.off('meet:chat-message', handleChatMessage)
    }
  }, [socket, meetId, user])

  const handleSend = () => {
    if (!message.trim() || !socket?.connected || !user || !meetId) return

    socket.emit('meet:chat-message', {
      meetId,
      message: message.trim(),
    })

    setMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Chat panel */}
      <div className="fixed md:relative inset-0 md:inset-auto md:w-80 bg-background border-l border-border/50 flex flex-col flex-shrink-0 z-50 md:z-auto pb-24 md:pb-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Chat</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((msg, index) => {
            const isOwn = msg.userId === user?.id
            return (
              <div
                key={index}
                className={cn(
                  'flex flex-col',
                  isOwn ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2',
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {!isOwn && (
                    <div className="text-xs font-medium mb-1 opacity-80">
                      {msg.userName || 'Unknown User'}
                    </div>
                  )}
                  <div className="text-sm">{msg.message}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border mb-4 md:mb-0">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

