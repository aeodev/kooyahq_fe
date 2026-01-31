import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { GET_LINK_PREVIEW } from '@/utils/api.routes'
import { cn } from '@/utils/cn'

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

interface LinkPreviewCardProps {
  url: string
  className?: string
}

export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await axiosInstance.get<{ status: string; data: LinkPreview }>(
          `${GET_LINK_PREVIEW()}?url=${encodeURIComponent(url)}`
        )
        if (response.data.data) {
          setPreview(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch link preview:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [url])

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border/20 bg-muted/50 p-3', className)}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading preview...</span>
        </div>
      </div>
    )
  }

  if (!preview || (!preview.title && !preview.image)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('text-primary hover:underline text-sm break-all', className)}
      >
        {url}
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-lg border border-border/20 bg-muted/50 hover:bg-muted transition-colors overflow-hidden',
        className
      )}
    >
      {preview.image && (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className="p-3">
        {preview.siteName && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-muted-foreground">{preview.siteName}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
        {preview.title && (
          <h4 className="font-semibold text-sm mb-1 line-clamp-2">{preview.title}</h4>
        )}
        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  )
}
