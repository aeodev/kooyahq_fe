import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import type { AIMessage } from '@/stores/ai-assistant.store'
import { ToolBadge } from './ToolBadge'
import { MessageContent } from './MessageContent'

interface MessageBubbleProps {
  message: AIMessage
  onQuickReply?: (text: string) => void
  isLastAssistant?: boolean
}

export function MessageBubble({ message, onQuickReply, isLastAssistant }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
      role="article"
      aria-label={isUser ? AI_ASSISTANT_STRINGS.userMessage : AI_ASSISTANT_STRINGS.assistantMessage}
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
          <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Tool executions">
            {message.toolExecutions.map((tool) => (
              <ToolBadge key={tool.id} tool={tool} />
            ))}
          </div>
        )}
        
        {/* Message content */}
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        ) : (
          <MessageContent 
            content={message.content} 
            onQuickReply={isLastAssistant ? onQuickReply : undefined}
            toolExecutions={message.toolExecutions}
          />
        )}
      </div>
    </motion.div>
  )
}

