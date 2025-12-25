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
  const store = useAIAssistantStore.getState()

  // Handle AI response (text streaming)
  const handleResponse = (data: AIResponsePayload) => {
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
    const { message } = data
    store.setError(message)
  }

  // Handle stream end
  const handleStreamEnd = () => {
    store.setLoading(false)
  }

  // Register all handlers
  socket.on(AIAssistantSocketEvents.RESPONSE, handleResponse)
  socket.on(AIAssistantSocketEvents.TOOL_START, handleToolStart)
  socket.on(AIAssistantSocketEvents.TOOL_COMPLETE, handleToolComplete)
  socket.on(AIAssistantSocketEvents.ERROR, handleError)
  socket.on(AIAssistantSocketEvents.STREAM_END, handleStreamEnd)

  // Store handlers for cleanup
  eventHandlers.set(AIAssistantSocketEvents.RESPONSE, handleResponse)
  eventHandlers.set(AIAssistantSocketEvents.TOOL_START, handleToolStart)
  eventHandlers.set(AIAssistantSocketEvents.TOOL_COMPLETE, handleToolComplete)
  eventHandlers.set(AIAssistantSocketEvents.ERROR, handleError)
  eventHandlers.set(AIAssistantSocketEvents.STREAM_END, handleStreamEnd)
}

/**
 * Send a message to the AI assistant via socket
 */
export function sendAIMessage(socket: Socket | null, message: string, conversationId?: string | null): void {
  if (!socket?.connected) {
    console.warn('[AI Assistant] Socket not connected')
    useAIAssistantStore.getState().setError('Not connected to server')
    return
  }

  socket.emit(AIAssistantSocketEvents.MESSAGE, {
    message,
    conversationId: conversationId || undefined,
  })
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


