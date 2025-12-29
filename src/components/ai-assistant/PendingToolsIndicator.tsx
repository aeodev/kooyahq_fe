import { motion } from 'framer-motion'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import type { AIToolExecution } from '@/stores/ai-assistant.store'
import { ToolBadge } from './ToolBadge'

interface PendingToolsIndicatorProps {
  tools: AIToolExecution[]
}

export function PendingToolsIndicator({ tools }: PendingToolsIndicatorProps) {
  if (tools.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label={AI_ASSISTANT_STRINGS.toolsExecuting(tools.length)}
    >
      <div className="bg-muted/40 rounded-xl px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {tools.map((tool) => (
            <ToolBadge key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

