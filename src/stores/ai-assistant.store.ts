import { create } from 'zustand'

// Types
export type MessageRole = 'user' | 'assistant'

export interface AIToolExecution {
  id: string
  name: string
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: unknown
  error?: string
}

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  toolExecutions?: AIToolExecution[]
}

// Socket event types
export const AIAssistantSocketEvents = {
  MESSAGE: 'ai:message',
  RESPONSE: 'ai:response',
  TOOL_START: 'ai:tool-start',
  TOOL_COMPLETE: 'ai:tool-complete',
  ERROR: 'ai:error',
  STREAM_END: 'ai:stream-end',
  CLEAR_CONVERSATION: 'ai:clear-conversation',
} as const

// State type
type AIAssistantState = {
  isOpen: boolean
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string
  conversationId: string | null
  error: string | null
  pendingToolExecutions: Map<string, AIToolExecution>
}

// Actions type
type AIAssistantActions = {
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (message: string) => void
  addUserMessage: (message: string) => void
  addAssistantMessage: (content: string) => void
  updateStreamingContent: (content: string, isComplete: boolean) => void
  addToolExecution: (tool: AIToolExecution) => void
  updateToolExecution: (toolId: string, updates: Partial<AIToolExecution>) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setConversationId: (id: string) => void
  clearMessages: () => void
  reset: () => void
}

type AIAssistantStore = AIAssistantState & AIAssistantActions

const initialState: AIAssistantState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  streamingContent: '',
  conversationId: null,
  error: null,
  pendingToolExecutions: new Map(),
}

export const useAIAssistantStore = create<AIAssistantStore>((set, get) => ({
  ...initialState,

  open: () => set({ isOpen: true }),
  
  close: () => set({ isOpen: false }),
  
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  sendMessage: (message: string) => {
    // This is handled by the socket listener - just add user message
    get().addUserMessage(message)
    set({ isLoading: true, error: null, streamingContent: '' })
  },

  addUserMessage: (message: string) => {
    const newMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    set((state) => ({
      messages: [...state.messages, newMessage],
    }))
  },

  addAssistantMessage: (content: string) => {
    const { pendingToolExecutions } = get()
    const toolExecutions = Array.from(pendingToolExecutions.values())
    
    const newMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      toolExecutions: toolExecutions.length > 0 ? toolExecutions : undefined,
    }
    set((state) => ({
      messages: [...state.messages, newMessage],
      streamingContent: '',
      isLoading: false,
      pendingToolExecutions: new Map(),
    }))
  },

  updateStreamingContent: (content: string, isComplete: boolean) => {
    if (isComplete) {
      get().addAssistantMessage(content)
    } else {
      set({ streamingContent: content })
    }
  },

  addToolExecution: (tool: AIToolExecution) => {
    set((state) => {
      const newMap = new Map(state.pendingToolExecutions)
      newMap.set(tool.id, tool)
      return { pendingToolExecutions: newMap }
    })
  },

  updateToolExecution: (toolId: string, updates: Partial<AIToolExecution>) => {
    set((state) => {
      const newMap = new Map(state.pendingToolExecutions)
      const existing = newMap.get(toolId)
      if (existing) {
        newMap.set(toolId, { ...existing, ...updates })
      }
      return { pendingToolExecutions: newMap }
    })
  },

  setError: (error: string | null) => set({ error, isLoading: false }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setConversationId: (id: string) => set({ conversationId: id }),

  clearMessages: () => set({ 
    messages: [], 
    conversationId: null,
    streamingContent: '',
    pendingToolExecutions: new Map(),
  }),

  reset: () => set(initialState),
}))

