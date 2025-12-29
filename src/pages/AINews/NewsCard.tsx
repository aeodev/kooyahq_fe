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
      {/* Always reserve image space to maintain consistent card height */}
      <div className="relative w-full aspect-video overflow-hidden bg-muted/30">
        {hasImage && !imageError ? (
          <img
            src={item.imageUrl}
            alt={decodedTitle}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          // Placeholder when no image or image failed to load
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-muted-foreground/50">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        )}
        {/* Source badge always visible */}
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
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Card>
  )
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export const NewsCard = memo(NewsCardComponent)
