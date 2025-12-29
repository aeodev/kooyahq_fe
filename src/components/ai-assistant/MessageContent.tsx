import { extractQuickReplies, formatInline } from './utils'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'

interface MessageContentProps {
  content: string
  onQuickReply?: (text: string) => void
}

export function MessageContent({ content, onQuickReply }: MessageContentProps) {
  const { toggleProjectSelection, showSelectionUI } = useAIAssistantStore()
  const lines = content.split('\n')
  const quickReplies = onQuickReply ? extractQuickReplies(content) : []
  const hasQuickReplies = quickReplies.length > 0

  const handleReplyClick = (reply: { text: string; label: string; type?: 'single' | 'multi' }) => {
    if (reply.type === 'multi') {
      toggleProjectSelection(reply.text)
      showSelectionUI()
    } else if (onQuickReply) {
      onQuickReply(reply.text)
    }
  }

  // If there are project quick replies, hide all text content (only show buttons)
  const hasProjectButtons = hasQuickReplies && quickReplies.some(r => r.type === 'multi')
  
  return (
    <div className="text-sm space-y-1">
      {!hasProjectButtons && lines.map((line, i) => {
        const trimmed = line.trim()
        
        // Bullet points: - or • or *
        if (/^[-•*]\s/.test(trimmed)) {
          const text = trimmed.replace(/^[-•*]\s/, '')
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary flex-shrink-0">•</span>
              <span>{formatInline(text)}</span>
            </div>
          )
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)/)
          if (match) {
            return (
              <div key={i} className="flex gap-2">
                <span className="text-primary flex-shrink-0 w-4 text-right">{match[1]}.</span>
                <span>{formatInline(match[2])}</span>
              </div>
            )
          }
        }
        
        // Empty line
        if (!trimmed) {
          return <div key={i} className="h-2" />
        }
        
        // Regular line
        return <div key={i}>{formatInline(line)}</div>
      })}
      
      {/* Quick reply buttons */}
      {hasQuickReplies && onQuickReply && (
        <div className={`flex flex-wrap gap-1.5 ${hasProjectButtons ? '' : 'mt-3 pt-2 border-t border-border/30'}`}>
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleReplyClick(reply)}
              className="px-3 py-1.5 text-xs rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              aria-label={AI_ASSISTANT_STRINGS.quickReply(reply.label)}
            >
              ✓ {reply.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

