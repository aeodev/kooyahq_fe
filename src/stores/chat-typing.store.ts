import { create } from 'zustand'

type TypingState = {
  typingUsers: Record<string, Set<string>>
}

type TypingActions = {
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
}

export const useChatTypingStore = create<TypingState & TypingActions>((set) => ({
  typingUsers: {},

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
    set((state) => {
      const typingSet = state.typingUsers[conversationId] || new Set<string>()
      if (isTyping) {
        typingSet.add(userId)
      } else {
        typingSet.delete(userId)
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: new Set(typingSet), // Create new Set to trigger reactivity
        },
      }
    })
  },
}))
