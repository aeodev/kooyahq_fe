import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ExternalLink, Twitter, Newspaper } from 'lucide-react'
import { cn } from '@/utils/cn'
import { decodeHtmlEntities } from '@/utils/html-entities'
import type { NewsItem } from '@/types/ai-news'

type NewsCardProps = {
  item: NewsItem & { formattedDate: string }
}

export const NewsCard = memo(function NewsCard({ item }: NewsCardProps) {
  const decodedTitle = decodeHtmlEntities(item.title)
  const decodedContent = item.content ? decodeHtmlEntities(item.content) : ''
  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-xl cursor-pointer',
        item.type === 'tweet' && 'border-l-4 border-l-blue-500'
      )}
      onClick={() => window.open(item.url, '_blank')}
    >
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Avatar/Icon */}
          <div className="flex-shrink-0">
            {item.type === 'tweet' ? (
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Twitter className="h-6 w-6 text-blue-500" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Newspaper className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {item.author && (
                  <span className="font-semibold text-foreground">
                    {item.author}
                  </span>
                )}
                {item.authorHandle && (
                  <span className="text-sm text-muted-foreground">
                    @{item.authorHandle}
                  </span>
                )}
                {item.verified && (
                  <span className="text-blue-500">✓</span>
                )}
                {item.source && !item.authorHandle && (
                  <span className="text-sm text-muted-foreground capitalize">
                    • {item.source}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  • {item.formattedDate}
                </span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>

            <h3 className="font-semibold text-lg mb-2 line-clamp-2">
              {decodedTitle}
            </h3>

            {decodedContent && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                {decodedContent}
              </p>
            )}

            {item.imageUrl && (
              <div className="rounded-xl border border-border/50 ring-1 ring-border/30 overflow-hidden mb-3 max-w-md">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn(
                'px-2 py-1 rounded-full',
                item.type === 'tweet'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-primary/10 text-primary'
              )}>
                {item.type === 'tweet' ? 'Tweet' : 'News'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

