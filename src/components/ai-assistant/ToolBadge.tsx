import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import type { AIToolExecution } from '@/stores/ai-assistant.store'

interface ToolBadgeProps {
  tool: AIToolExecution
}

export function ToolBadge({ tool }: ToolBadgeProps) {
  const getAriaLabel = () => {
    switch (tool.status) {
      case 'running':
        return AI_ASSISTANT_STRINGS.toolRunning(tool.name)
      case 'complete':
        return AI_ASSISTANT_STRINGS.toolComplete(tool.name)
      case 'error':
        return AI_ASSISTANT_STRINGS.toolError(tool.name)
      default:
        return `Tool ${tool.name}`
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        tool.status === 'running' && 'bg-blue-500/10 text-blue-400',
        tool.status === 'complete' && 'bg-emerald-500/10 text-emerald-400',
        tool.status === 'error' && 'bg-red-500/10 text-red-400'
      )}
      role="status"
      aria-label={getAriaLabel()}
    >
      {tool.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
      {tool.status === 'complete' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {tool.status === 'error' && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      <span>{tool.name.replace(/_/g, ' ')}</span>
    </div>
  )
}

