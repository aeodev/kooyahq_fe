import type { MessageWithSender } from '@/types/chat'
import { LinkPreviewCard } from './LinkPreviewCard'
import { cn } from '@/utils/cn'

interface MessageBubbleProps {
  message: MessageWithSender
  isOwn: boolean
  className?: string
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g

export function MessageBubble({ message, isOwn, className }: MessageBubbleProps) {
  // Extract URLs from message content
  const urls = message.content.match(URL_REGEX) || []
  const hasUrls = urls.length > 0

  // Check for image attachments
  const imageAttachments = message.attachments?.filter((att) => att.type === 'image') || []
  const linkAttachments = message.attachments?.filter((att) => att.type === 'link') || []

  // Split content by URLs to render text and links separately
  const renderContent = () => {
    if (!hasUrls) {
      return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
    }

    const parts = message.content.split(URL_REGEX)
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          if (URL_REGEX.test(part)) {
            URL_REGEX.lastIndex = 0
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'rounded-2xl px-4 py-2 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {renderContent()}
      </div>

      {/* Image attachments */}
      {imageAttachments.length > 0 && (
        <div className={cn('flex flex-col gap-2', isOwn && 'items-end')}>
          {imageAttachments.map((att, idx) => (
            <div key={idx} className="max-w-xs rounded-lg overflow-hidden">
              <img
                src={att.url}
                alt={att.name || 'Image attachment'}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          ))}
        </div>
      )}

      {/* Link previews */}
      {linkAttachments.length > 0 && (
        <div className={cn('flex flex-col gap-2', isOwn && 'items-end')}>
          {linkAttachments.map((att, idx) => (
            <LinkPreviewCard
              key={idx}
              url={att.url}
              className="max-w-md"
            />
          ))}
        </div>
      )}

      {/* Auto-detect URLs in content for preview (if not already in attachments) */}
      {hasUrls && linkAttachments.length === 0 && (
        <div className={cn('flex flex-col gap-2', isOwn && 'items-end')}>
          {urls.slice(0, 1).map((url, idx) => (
            <LinkPreviewCard key={idx} url={url} className="max-w-md" />
          ))}
        </div>
      )}
    </div>
  )
}
