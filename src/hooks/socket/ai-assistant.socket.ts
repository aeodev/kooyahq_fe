import type { Socket } from 'socket.io-client'
import { useAIAssistantStore, AIAssistantSocketEvents, type AIToolExecution } from '@/stores/ai-assistant.store'

// Response payload types
interface AIResponsePayload {
  conversationId: string
  content: string
  isComplete: boolean
}

interface AIToolStartPayload {
  conversationId: string
  toolName: string
  toolId: string
  params: Record<string, unknown>
}

interface AIToolCompletePayload {
  conversationId: string
  toolId: string
  toolName: string
  result: unknown
  success: boolean
  error?: string
}

interface AIErrorPayload {
  conversationId?: string
  message: string
  code?: string
}

/**
 * Register socket handlers for AI assistant module
 * Called when socket connects
 */
export function registerAIAssistantHandlers(socket: Socket, eventHandlers: Map<string, (...args: unknown[]) => void>): void {
  console.log('[AI Assistant] Registering socket handlers')
  const store = useAIAssistantStore.getState()

  // Handle AI response (text streaming)
  const handleResponse = (data: AIResponsePayload) => {
    console.log('[AI Assistant] Response received:', data)
    const { conversationId, content, isComplete } = data
    
    // Set conversation ID if not set
    if (!useAIAssistantStore.getState().conversationId) {
      store.setConversationId(conversationId)
    }
    
    store.updateStreamingContent(content, isComplete)
  }

  // Handle tool execution start
  const handleToolStart = (data: AIToolStartPayload) => {
    const { toolId, toolName, params } = data
    
    const toolExecution: AIToolExecution = {
      id: toolId,
      name: toolName,
      params,
      status: 'running',
    }
    
    store.addToolExecution(toolExecution)
  }

  // Handle tool execution complete
  const handleToolComplete = (data: AIToolCompletePayload) => {
    const { toolId, result, success, error } = data
    
    store.updateToolExecution(toolId, {
      status: success ? 'complete' : 'error',
      result,
      error,
    })
  }

  // Handle errors
  const handleError = (data: AIErrorPayload) => {
    console.error('[AI Assistant] Error received:', data)
    const { message } = data
    store.setError(message)
  }

  // Handle stream end
  const handleStreamEnd = () => {
    console.log('[AI Assistant] Stream ended')
    store.setLoading(false)
  }

  // Handle socket connection status
  const handleConnect = () => {
    store.setOffline(false)
    // Retry sending queued messages
    const queued = store.queuedMessages
    if (queued.length > 0) {
      queued.forEach((message) => {
        sendAIMessage(socket, message, store.conversationId)
      })
      store.clearQueuedMessages()
    }
  }

  const handleDisconnect = () => {
    store.setOffline(true)
  }

  // Register all handlers
  console.log('[AI Assistant] Registering event listeners:', {
    RESPONSE: AIAssistantSocketEvents.RESPONSE,
    TOOL_START: AIAssistantSocketEvents.TOOL_START,
    TOOL_COMPLETE: AIAssistantSocketEvents.TOOL_COMPLETE,
    ERROR: AIAssistantSocketEvents.ERROR,
    STREAM_END: AIAssistantSocketEvents.STREAM_END,
  })
  
  socket.on(AIAssistantSocketEvents.RESPONSE, handleResponse)
  socket.on(AIAssistantSocketEvents.TOOL_START, handleToolStart)
  socket.on(AIAssistantSocketEvents.TOOL_COMPLETE, handleToolComplete)
  socket.on(AIAssistantSocketEvents.ERROR, handleError)
  socket.on(AIAssistantSocketEvents.STREAM_END, handleStreamEnd)
  socket.on('connect', handleConnect)
  socket.on('disconnect', handleDisconnect)
  
  console.log('[AI Assistant] Handlers registered successfully')

  // Store handlers for cleanup
  eventHandlers.set('connect', handleConnect)
  eventHandlers.set('disconnect', handleDisconnect)

  // Store handlers for cleanup (wrap typed handlers to match Map signature)
  eventHandlers.set(AIAssistantSocketEvents.RESPONSE, handleResponse as (...args: unknown[]) => void)
  eventHandlers.set(AIAssistantSocketEvents.TOOL_START, handleToolStart as (...args: unknown[]) => void)
  eventHandlers.set(AIAssistantSocketEvents.TOOL_COMPLETE, handleToolComplete as (...args: unknown[]) => void)
  eventHandlers.set(AIAssistantSocketEvents.ERROR, handleError as (...args: unknown[]) => void)
  eventHandlers.set(AIAssistantSocketEvents.STREAM_END, handleStreamEnd as (...args: unknown[]) => void)
}

/**
 * Send a message to the AI assistant via socket
 */
export function sendAIMessage(socket: Socket | null, message: string, conversationId?: string | null): void {
  const store = useAIAssistantStore.getState()
  
  console.log('[AI Assistant] Sending message:', { message, conversationId, socketConnected: socket?.connected })
  
  if (!socket?.connected) {
    console.warn('[AI Assistant] Socket not connected, queueing message')
    store.setOffline(true)
    store.queueMessage(message)
    store.setError('Not connected to server. Message will be sent when connection is restored.')
    return
  }

  const payload = {
    message,
    conversationId: conversationId || undefined,
  }
  
  console.log('[AI Assistant] Emitting message event:', AIAssistantSocketEvents.MESSAGE, payload)
  socket.emit(AIAssistantSocketEvents.MESSAGE, payload)
}

/**
 * Clear conversation history on the server
 */
export function clearAIConversation(socket: Socket | null, conversationId: string): void {
  if (!socket?.connected) return

  socket.emit(AIAssistantSocketEvents.CLEAR_CONVERSATION, {
    conversationId,
  })
}


