import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { extractQuickReplies, formatInline } from './utils'
import { AI_ASSISTANT_STRINGS } from '@/constants/ai-assistant'
import { useAIAssistantStore } from '@/stores/ai-assistant.store'
import type { AIToolExecution } from '@/stores/ai-assistant.store'

interface MessageContentProps {
  content: string
  onQuickReply?: (text: string) => void
  toolExecutions?: AIToolExecution[]
}

export function MessageContent({ content, onQuickReply, toolExecutions }: MessageContentProps) {
  const { toggleProjectSelection, showSelectionUI } = useAIAssistantStore()
  const [copied, setCopied] = useState(false)
  const lines = content.split('\n')
  
  // Check if this is a get_users tool result - if so, don't treat as project selection
  const hasGetUsersTool = toolExecutions?.some(
    (tool) => tool.name === 'get_users' && tool.status === 'complete'
  )
  
  // Only extract quick replies if it's NOT a get_users result
  const quickReplies = onQuickReply && !hasGetUsersTool ? extractQuickReplies(content) : []
  const hasQuickReplies = quickReplies.length > 0

  // Extract meet room URL from tool executions
  const meetRoomUrl = toolExecutions?.find(
    (tool) => tool.name === 'create_meet_room' && tool.status === 'complete' && tool.result
  )?.result as { meetId?: string; url?: string } | undefined

  const fullUrl = meetRoomUrl?.meetId 
    ? `${window.location.origin}/meet/${meetRoomUrl.meetId}`
    : null

  const handleCopyUrl = async () => {
    if (!fullUrl) return
    
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

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
      {/* Copy URL button for meet rooms */}
      {fullUrl && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs text-muted-foreground flex-1 truncate">{fullUrl}</span>
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title={copied ? 'Copied!' : 'Copy URL'}
            aria-label={copied ? 'URL copied to clipboard' : 'Copy meeting room URL'}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      
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

