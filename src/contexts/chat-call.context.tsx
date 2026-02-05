import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useChatCall } from '@/hooks/chat-call.hooks'
import { useChatConversationsStore } from '@/stores/chat-conversations.store'
import type { ConversationWithParticipants } from '@/types/chat'

type ChatCallContextValue = ReturnType<typeof useChatCall> & {
  isOverlayOpen: boolean
  openOverlay: () => void
  closeOverlay: () => void
}

const ChatCallContext = createContext<ChatCallContextValue | null>(null)

export function ChatCallProvider({ children }: PropsWithChildren) {
  const activeConversationId = useChatConversationsStore((state) => state.activeConversationId)
  const conversations = useChatConversationsStore((state) => state.conversations)

  const activeConversation: ConversationWithParticipants | null =
    conversations.find((conversation) => conversation.id === activeConversationId) || null

  const callState = useChatCall(activeConversation)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const prevStatusRef = useRef(callState.status)

  useEffect(() => {
    const previousStatus = prevStatusRef.current
    if (callState.status === 'idle') {
      setIsOverlayOpen(false)
    } else if (callState.status === 'failed') {
      setIsOverlayOpen(true)
    } else if (previousStatus === 'idle' || previousStatus === 'ended' || previousStatus === 'failed') {
      setIsOverlayOpen(true)
    }
    prevStatusRef.current = callState.status
  }, [callState.status])

  const value = useMemo<ChatCallContextValue>(() => {
    return {
      ...callState,
      isOverlayOpen,
      openOverlay: () => setIsOverlayOpen(true),
      closeOverlay: () => setIsOverlayOpen(false),
    }
  }, [callState, isOverlayOpen])

  return (
    <ChatCallContext.Provider value={value}>
      {children}
    </ChatCallContext.Provider>
  )
}

export function useChatCallContext() {
  const context = useContext(ChatCallContext)
  if (!context) {
    throw new Error('useChatCallContext must be used within ChatCallProvider')
  }
  return context
}
