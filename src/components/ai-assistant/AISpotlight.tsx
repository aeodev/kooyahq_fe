import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import { sendAIMessage, clearAIConversation } from '@/hooks/socket/ai-assistant.socket'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'
import { PendingToolsIndicator } from './PendingToolsIndicator'
import { AIHeader } from './AIHeader'
import { AIInput } from './AIInput'
import { ConnectionStatus } from './ConnectionStatus'
import { TimerSelectionUI } from './TimerSelectionUI'
import { AIAssistantErrorBoundary } from './ErrorBoundary'

function AISpotlightContent() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Store state
  const isOpen = useAIAssistantStore((s) => s.isOpen)
  const messages = useAIAssistantStore((s) => s.messages)
  const isLoading = useAIAssistantStore((s) => s.isLoading)
  const streamingContent = useAIAssistantStore((s) => s.streamingContent)
  const conversationId = useAIAssistantStore((s) => s.conversationId)
  const error = useAIAssistantStore((s) => s.error)
  const pendingToolExecutions = useAIAssistantStore((s) => s.pendingToolExecutions)
  const isOffline = useAIAssistantStore((s) => s.isOffline)
  const toggle = useAIAssistantStore((s) => s.toggle)
  const close = useAIAssistantStore((s) => s.close)
  const sendMessage = useAIAssistantStore((s) => s.sendMessage)
  const clearMessages = useAIAssistantStore((s) => s.clearMessages)
  const setError = useAIAssistantStore((s) => s.setError)
  const startVoiceRecording = useAIAssistantStore((s) => s.startVoiceRecording)

  // Socket and auth
  const socket = useSocketStore((s) => s.socket)
  const connected = useSocketStore((s) => s.connected)
  const connectSocket = useSocketStore((s) => s.connect)
  const can = useAuthStore((s) => s.can)
  const hasAIAccess = can(PERMISSIONS.AI_ASSISTANT_ACCESS) || can(PERMISSIONS.SYSTEM_FULL_ACCESS)

  // Update offline status based on socket connection
  useEffect(() => {
    const store = useAIAssistantStore.getState()
    store.setOffline(!connected)
  }, [connected])

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

  const handleClear = () => {
    if (conversationId) {
      clearAIConversation(socket, conversationId)
    }
    clearMessages()
  }

  const handleVoiceRecordingStarted = () => {
    // Reset the flag after voice recording has started
    useAIAssistantStore.setState({ startVoiceRecording: false })
  }

  const pendingTools = pendingToolExecutions

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
            aria-hidden="true"
          />

          {/* Spotlight Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            role="dialog"
            aria-labelledby="ai-assistant-title"
            aria-modal="true"
          >
            {/* Header */}
            <AIHeader
              hasMessages={messages.length > 0}
              onClear={handleClear}
              onClose={close}
            />

            {/* Messages */}
            <div
              className="max-h-[50vh] min-h-[120px] overflow-y-auto p-4 space-y-3"
              aria-live="polite"
              aria-busy={isLoading}
            >
              {messages.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {AI_ASSISTANT_STRINGS.emptyStateMessage}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      AI_ASSISTANT_STRINGS.suggestions.startTimer,
                      AI_ASSISTANT_STRINGS.suggestions.whatAmIWorkingOn,
                      AI_ASSISTANT_STRINGS.suggestions.createTicket,
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion)
                        }}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={AI_ASSISTANT_STRINGS.useSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
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

            {/* Timer Selection UI */}
            <TimerSelectionUI />

            {/* Connection status */}
            <ConnectionStatus
              isOffline={isOffline}
              onRetry={connectSocket}
            />

            {/* Error message */}
            {error && (
              <div
                className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            {/* Input */}
            <AIInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onClose={close}
              isLoading={isLoading}
              disabled={isOffline}
              startVoiceRecording={startVoiceRecording}
              onVoiceRecordingStarted={handleVoiceRecordingStarted}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function AISpotlight() {
  return (
    <AIAssistantErrorBoundary>
      <AISpotlightContent />
    </AIAssistantErrorBoundary>
  )
}
