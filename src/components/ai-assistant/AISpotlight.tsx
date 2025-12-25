import { useState, useEffect, useRef, KeyboardEvent, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAIAssistantStore, type AIMessage, type AIToolExecution } from '@/stores/ai-assistant.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { sendAIMessage, clearAIConversation } from '@/hooks/socket/ai-assistant.socket'

// Extract quick reply options from content
function extractQuickReplies(content: string): { text: string; label: string }[] {
  const lines = content.split('\n')
  const replies: { text: string; label: string }[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet points that look like options: "• Board Name (PREFIX) - type"
    if (/^[-•*]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-•*]\s/, '')
      // Extract the name part (before parentheses or dash details)
      const match = text.match(/^([^(]+)/)
      if (match) {
        const label = match[1].trim()
        replies.push({ text: label, label })
      }
    }
  }
  
  return replies
}

// Simple markdown-like formatting for AI messages
function FormatContent({ content, onQuickReply }: { content: string; onQuickReply?: (text: string) => void }) {
  // Split by lines and process each
  const lines = content.split('\n')
  const quickReplies = onQuickReply ? extractQuickReplies(content) : []
  const hasQuickReplies = quickReplies.length > 0
  
  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        
        // Bullet points: - or • or *
        if (/^[-•*]\s/.test(trimmed)) {
          const text = trimmed.replace(/^[-•*]\s/, '')
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary flex-shrink-0">•</span>
              <span>{formatInline(text)}</span>
            </div>
          )
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)/)
          if (match) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-primary flex-shrink-0 w-4 text-right">{match[1]}.</span>
                <span>{formatInline(match[2])}</span>
              </div>
            )
          }
        }
        
        // Empty line
        if (!trimmed) {
          return <div key={i} className="h-2" />
        }
        
        // Regular line
        return <div key={i}>{formatInline(line)}</div>
      })}
      
      {/* Quick reply buttons */}
      {hasQuickReplies && onQuickReply && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/30">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => onQuickReply(reply.text)}
              className="px-3 py-1.5 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Format inline elements like **bold**
function formatInline(text: string): ReactNode {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

// Tool execution status badge
function ToolBadge({ tool }: { tool: AIToolExecution }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        tool.status === 'running' && 'bg-blue-500/10 text-blue-400',
        tool.status === 'complete' && 'bg-emerald-500/10 text-emerald-400',
        tool.status === 'error' && 'bg-red-500/10 text-red-400'
      )}
    >
      {tool.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
      {tool.status === 'complete' && <CheckCircle2 className="h-3 w-3" />}
      {tool.status === 'error' && <AlertCircle className="h-3 w-3" />}
      <span>{tool.name.replace(/_/g, ' ')}</span>
    </div>
  )
}

// Message bubble component
function MessageBubble({ message, onQuickReply, isLastAssistant }: { message: AIMessage; onQuickReply?: (text: string) => void; isLastAssistant?: boolean }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/60 text-foreground'
        )}
      >
        {/* Tool executions */}
        {message.toolExecutions && message.toolExecutions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.toolExecutions.map((tool) => (
              <ToolBadge key={tool.id} tool={tool} />
            ))}
          </div>
        )}
        
        {/* Message content */}
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <FormatContent 
            content={message.content} 
            onQuickReply={isLastAssistant ? onQuickReply : undefined} 
          />
        )}
      </div>
    </motion.div>
  )
}

// Streaming indicator
function StreamingIndicator({ content }: { content: string }) {
  if (!content) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-start"
      >
        <div className="bg-muted/60 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="max-w-[85%] bg-muted/60 rounded-2xl px-4 py-2.5">
        <FormatContent content={content} />
      </div>
    </motion.div>
  )
}

// Pending tools indicator
function PendingToolsIndicator({ tools }: { tools: AIToolExecution[] }) {
  if (tools.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="bg-muted/40 rounded-xl px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {tools.map((tool) => (
            <ToolBadge key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function AISpotlight() {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Store state
  const isOpen = useAIAssistantStore((s) => s.isOpen)
  const messages = useAIAssistantStore((s) => s.messages)
  const isLoading = useAIAssistantStore((s) => s.isLoading)
  const streamingContent = useAIAssistantStore((s) => s.streamingContent)
  const conversationId = useAIAssistantStore((s) => s.conversationId)
  const error = useAIAssistantStore((s) => s.error)
  const pendingToolExecutions = useAIAssistantStore((s) => s.pendingToolExecutions)
  const toggle = useAIAssistantStore((s) => s.toggle)
  const close = useAIAssistantStore((s) => s.close)
  const sendMessage = useAIAssistantStore((s) => s.sendMessage)
  const clearMessages = useAIAssistantStore((s) => s.clearMessages)
  const setError = useAIAssistantStore((s) => s.setError)

  // Socket and auth
  const socket = useSocketStore((s) => s.socket)
  const can = useAuthStore((s) => s.can)
  const hasAIAccess = can(PERMISSIONS.AI_ASSISTANT_ACCESS) || can(PERMISSIONS.SYSTEM_FULL_ACCESS)

  // Global keyboard shortcut: Cmd+J / Ctrl+J
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Check for Cmd+J (Mac) or Ctrl+J (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        if (hasAIAccess) {
          toggle()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, hasAIAccess])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, setError])

  // Don't render if no access
  if (!hasAIAccess) return null

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return

    sendMessage(input.trim())
    sendAIMessage(socket, input.trim(), conversationId)
    setInput('')
  }

  const handleQuickReply = (text: string) => {
    if (isLoading) return
    sendMessage(text)
    sendAIMessage(socket, text, conversationId)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      close()
    }
  }

  const handleClear = () => {
    if (conversationId) {
      clearAIConversation(socket, conversationId)
    }
    clearMessages()
  }

  const pendingTools = Array.from(pendingToolExecutions.values())

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={close}
          />

          {/* Spotlight Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Kooya AI</h2>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="max-h-[50vh] min-h-[120px] overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Ask me anything — time tracking, tickets, or tasks.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Start timer', 'What am I working on?', 'Create a ticket'].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion)
                            inputRef.current?.focus()
                          }}
                          className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Find if this is the last assistant message (for showing quick replies)
                    const isLastAssistant = message.role === 'assistant' && 
                      !messages.slice(index + 1).some(m => m.role === 'assistant')
                    return (
                      <MessageBubble 
                        key={message.id} 
                        message={message} 
                        onQuickReply={handleQuickReply}
                        isLastAssistant={isLastAssistant && !isLoading}
                      />
                    )
                  })}
                  
                  {/* Pending tool executions */}
                  {pendingTools.length > 0 && <PendingToolsIndicator tools={pendingTools} />}
                  
                  {/* Streaming content or loading indicator */}
                  {isLoading && <StreamingIndicator content={streamingContent} />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-4 pt-0">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something..."
                  disabled={isLoading}
                  className="w-full h-10 pl-3 pr-10 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50 transition-all"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

