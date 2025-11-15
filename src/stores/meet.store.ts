import { create } from 'zustand'

export interface ChatMessage {
  userId: string
  userName?: string
  message: string
  timestamp: string
}

export interface Participant {
  userId: string
  userName?: string
  profilePic?: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
}

type MeetState = {
  meetId: string | null
  participants: Map<string, Participant>
  chatMessages: ChatMessage[]
  isRecording: boolean
  isChatOpen: boolean
  isMirrored: boolean
}

type MeetActions = {
  setMeetId: (meetId: string | null) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (userId: string) => void
  updateParticipant: (userId: string, updates: Partial<Participant>) => void
  addChatMessage: (message: ChatMessage) => void
  setRecording: (isRecording: boolean) => void
  toggleChat: () => void
  toggleMirror: () => void
  reset: () => void
}

type MeetStore = MeetState & MeetActions

const initialState: MeetState = {
  meetId: null,
  participants: new Map(),
  chatMessages: [],
  isRecording: false,
  isChatOpen: false,
  isMirrored: false,
}

export const useMeetStore = create<MeetStore>((set, get) => ({
  ...initialState,

  setMeetId: (meetId) => set({ meetId }),

  addParticipant: (participant) => {
    const participants = new Map(get().participants)
    participants.set(participant.userId, participant)
    set({ participants })
  },

  removeParticipant: (userId) => {
    const participants = new Map(get().participants)
    participants.delete(userId)
    set({ participants })
  },

  updateParticipant: (userId, updates) => {
    const participants = new Map(get().participants)
    const existing = participants.get(userId)
    if (existing) {
      participants.set(userId, { ...existing, ...updates })
      set({ participants })
    }
  },

  addChatMessage: (message) => {
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    }))
  },

  setRecording: (isRecording) => set({ isRecording }),

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  toggleMirror: () => set((state) => ({ isMirrored: !state.isMirrored })),

  reset: () => set(initialState),
}))

