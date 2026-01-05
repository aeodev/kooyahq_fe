 import { create } from 'zustand'
import { useProjectTaskStore } from '@/stores/project-task.store'

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
  AUDIO_RESPONSE: 'ai:audio-response',
  TOOL_START: 'ai:tool-start',
  TOOL_COMPLETE: 'ai:tool-complete',
  ERROR: 'ai:error',
  STREAM_END: 'ai:stream-end',
  CLEAR_CONVERSATION: 'ai:clear-conversation',
} as const

// Audio response payload type
export interface AIAudioResponsePayload {
  conversationId: string
  audio: string // base64 encoded audio
  format: 'mp3'
}

// Audio response listeners for Morgan AI
type AudioResponseListener = (payload: AIAudioResponsePayload) => void
const audioResponseListeners = new Set<AudioResponseListener>()

export function subscribeToAudioResponse(listener: AudioResponseListener): () => void {
  audioResponseListeners.add(listener)
  return () => audioResponseListeners.delete(listener)
}

export function notifyAudioResponseListeners(payload: AIAudioResponsePayload): void {
  audioResponseListeners.forEach(listener => listener(payload))
}

// State type
type AIAssistantState = {
  isOpen: boolean
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string
  conversationId: string | null
  error: string | null
  pendingToolExecutions: AIToolExecution[]
  isOffline: boolean
  queuedMessages: string[]
  selectedProjects: string[]
  showSelections: boolean
  startVoiceRecording: boolean
  navigateToMeet: string | null
}

// Actions type
type AIAssistantActions = {
  open: () => void
  openWithVoiceRecording: () => void
  close: () => void
  toggle: () => void
  sendMessage: (message: string) => void
  addUserMessage: (message: string) => void
  addAssistantMessage: (content: string) => void
  updateStreamingContent: (content: string, isComplete: boolean) => void
  addToolExecution: (tool: AIToolExecution) => void
  updateToolExecution: (toolId: string, updates: Partial<AIToolExecution>) => void
  removeToolExecution: (toolId: string) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setConversationId: (id: string) => void
  setOffline: (offline: boolean) => void
  queueMessage: (message: string) => void
  clearQueuedMessages: () => void
  clearMessages: () => void
  reset: () => void
  // Project selection management
  toggleProjectSelection: (projectName: string) => void
  clearSelections: () => void
  showSelectionUI: () => void
  hideSelectionUI: () => void
  confirmSelections: () => string | null
  // Meet navigation
  setNavigateToMeet: (meetId: string | null) => void
}

type AIAssistantStore = AIAssistantState & AIAssistantActions

const initialState: AIAssistantState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  streamingContent: '',
  conversationId: null,
  error: null,
  pendingToolExecutions: [],
  isOffline: false,
  queuedMessages: [],
  selectedProjects: [],
  showSelections: false,
  startVoiceRecording: false,
  navigateToMeet: null,
}

export const useAIAssistantStore = create<AIAssistantStore>((set, get) => ({
  ...initialState,

  open: () => set({ isOpen: true }),

  openWithVoiceRecording: () => set({ isOpen: true, startVoiceRecording: true }),

  close: () => set({ isOpen: false, startVoiceRecording: false }),
  
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  sendMessage: (message: string) => {
    // Optimistically add user message
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
    
    const newMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      toolExecutions: pendingToolExecutions.length > 0 ? pendingToolExecutions : undefined,
    }
    set((state) => ({
      messages: [...state.messages, newMessage],
      streamingContent: '',
      isLoading: false,
      pendingToolExecutions: [],
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
      // Check if tool already exists
      const exists = state.pendingToolExecutions.some(t => t.id === tool.id)
      if (exists) {
        return state
      }
      return { pendingToolExecutions: [...state.pendingToolExecutions, tool] }
    })
  },

  updateToolExecution: (toolId: string, updates: Partial<AIToolExecution>) => {
    set((state) => {
      const updated = state.pendingToolExecutions.map(tool =>
        tool.id === toolId ? { ...tool, ...updates } : tool
      )
      return { pendingToolExecutions: updated }
    })
  },

  removeToolExecution: (toolId: string) => {
    set((state) => ({
      pendingToolExecutions: state.pendingToolExecutions.filter(tool => tool.id !== toolId)
    }))
  },

  setError: (error: string | null) => set({ error, isLoading: false }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setConversationId: (id: string) => set({ conversationId: id }),

  setOffline: (offline: boolean) => set({ isOffline: offline }),

  queueMessage: (message: string) => {
    set((state) => ({
      queuedMessages: [...state.queuedMessages, message],
    }))
  },

  clearQueuedMessages: () => set({ queuedMessages: [] }),

  clearMessages: () => set({
    messages: [],
    conversationId: null,
    streamingContent: '',
    pendingToolExecutions: [],
    queuedMessages: [],
    selectedProjects: [],
    showSelections: false,
  }),

  // Project selection management
  toggleProjectSelection: (projectName: string) => {
    set((state) => {
      const isSelected = state.selectedProjects.includes(projectName)
      const selectedProjects = isSelected
        ? state.selectedProjects.filter(p => p !== projectName)
        : [...state.selectedProjects, projectName]
      return { selectedProjects }
    })
  },

  clearSelections: () => set({
    selectedProjects: [],
    showSelections: false,
  }),

  showSelectionUI: () => set({ showSelections: true }),

  hideSelectionUI: () => set({ showSelections: false }),

  confirmSelections: () => {
    const { selectedProjects } = get()
    if (selectedProjects.length > 0) {
      const projectTaskStore = useProjectTaskStore.getState()
      projectTaskStore.setSelectedProjects(selectedProjects)
      projectTaskStore.setActiveProject(selectedProjects[0])
      
      const message = selectedProjects.length === 1
        ? `start timer for ${selectedProjects[0]}`
        : `start timer for ${selectedProjects.join(' and ')}`
      get().sendMessage(message)
      get().clearSelections()
      return message
    }
    return null
  },

  setNavigateToMeet: (meetId: string | null) => set({ navigateToMeet: meetId }),

  reset: () => set(initialState),
}))


