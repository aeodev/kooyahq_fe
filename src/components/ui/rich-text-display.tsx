import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'
import { richTextDocToHtml } from '@/utils/rich-text'
import type { RichTextDoc } from '@/types/rich-text'

type RichTextDisplayProps = {
  content: string | RichTextDoc
  className?: string
  onDoubleClick?: () => void
}

export function RichTextDisplay({ content, className, onDoubleClick }: RichTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const htmlContent = richTextDocToHtml(content)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Handle image errors
    const images = container.querySelectorAll('img')
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement
      img.style.display = 'none'
    }
    images.forEach((img) => {
      img.addEventListener('error', handleImageError)
      // Also handle case where src is empty or invalid
      if (!img.src || img.src === window.location.href) {
        img.style.display = 'none'
      }
    })

    // Handle video errors
    const videos = container.querySelectorAll('video')
    const handleVideoError = (e: Event) => {
      const video = e.target as HTMLVideoElement
      video.style.display = 'none'
    }
    videos.forEach((video) => {
      video.addEventListener('error', handleVideoError)
      if (!video.src && !video.srcObject) {
        video.style.display = 'none'
      }
    })

    // Handle iframe errors (for embedded videos)
    const iframes = container.querySelectorAll('iframe')
    const handleIframeError = (e: Event) => {
      const iframe = e.target as HTMLIFrameElement
      iframe.style.display = 'none'
    }
    iframes.forEach((iframe) => {
      iframe.addEventListener('error', handleIframeError)
      // Check if src is empty or invalid
      if (!iframe.src || iframe.src === 'about:blank') {
        iframe.style.display = 'none'
      }
    })

    return () => {
      images.forEach((img) => img.removeEventListener('error', handleImageError))
      videos.forEach((video) => video.removeEventListener('error', handleVideoError))
      iframes.forEach((iframe) => iframe.removeEventListener('error', handleIframeError))
    }
  }, [htmlContent])

  return (
    <div
      ref={containerRef}
      className={cn('rich-text-display rich-text-display--ticket ql-editor', className)}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      onDoubleClick={onDoubleClick}
    />
  )
}


