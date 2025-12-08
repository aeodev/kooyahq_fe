import { memo, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ExternalLink } from 'lucide-react'
import { decodeHtmlEntities } from '@/utils/html-entities'
import { cn } from '@/utils/cn'
import { isGifUrl } from '@/utils/image.utils'
import { getSourceColor, formatSourceName } from '@/utils/news.utils'
import type { NewsItem } from '@/types/ai-news'

type NewsCardProps = {
  item: NewsItem
  formattedDate: string
}

function NewsCardComponent({ item, formattedDate }: NewsCardProps) {
  const decodedTitle = decodeHtmlEntities(item.title)
  const decodedContent = item.content ? decodeHtmlEntities(item.content) : ''
  // Filter out GIFs even if they come from backend (safety net for cached data)
  const hasImage = Boolean(item.imageUrl && !isGifUrl(item.imageUrl))
  const [imageError, setImageError] = useState(false)
  
  // Reset image error when imageUrl changes
  useEffect(() => {
    setImageError(false)
  }, [item.imageUrl])

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer"
      onClick={() => window.open(item.url, '_blank')}
    >
      {hasImage && !imageError && (
        <div className="relative w-full aspect-video overflow-hidden bg-muted/30">
          <img
            src={item.imageUrl}
            alt={decodedTitle}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute top-3 right-3">
            <span
              className={cn(
                'px-2 py-1 text-xs font-semibold text-white rounded uppercase shadow-sm',
                getSourceColor(item.source)
              )}
            >
              {formatSourceName(item.source)}
            </span>
          </div>
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {item.author && <span className="font-medium">{item.author}</span>}
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
        
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {decodedTitle}
        </h3>
        
        {decodedContent && (
          <p className="text-muted-foreground text-sm line-clamp-3">
            {decodedContent}
          </p>
        )}
        
        <div className="mt-3 flex items-center justify-between">
          {!hasImage && (
            <span
              className={cn(
                'px-2 py-1 text-xs font-semibold text-white rounded uppercase',
                getSourceColor(item.source)
              )}
            >
              {formatSourceName(item.source)}
            </span>
          )}
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Card>
  )
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export const NewsCard = memo(NewsCardComponent)
