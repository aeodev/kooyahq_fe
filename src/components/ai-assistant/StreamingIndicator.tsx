import { motion } from 'framer-motion'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import { MessageContent } from './MessageContent'

interface StreamingIndicatorProps {
  content: string
}

export function StreamingIndicator({ content }: StreamingIndicatorProps) {
  if (!content) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-start"
        role="status"
        aria-live="polite"
        aria-label={AI_ASSISTANT_STRINGS.aiThinking}
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
      role="status"
      aria-live="polite"
      aria-label={AI_ASSISTANT_STRINGS.aiResponseStreaming}
    >
      <div className="max-w-[85%] bg-muted/60 rounded-2xl px-4 py-2.5">
        <MessageContent content={content} />
      </div>
    </motion.div>
  )
}

