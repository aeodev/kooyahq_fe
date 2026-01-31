import { useState } from 'react'
import { cn } from '@/utils/cn'

type AvatarProps = {
  src?: string | null
  name: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackClassName?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function Avatar({ src, name, className, size = 'md', fallbackClassName }: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const hasValidSrc = src && src.trim() && !imageError

  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
      {hasValidSrc ? (
        <>
          {!imageLoaded && (
            <span className={cn('font-medium', fallbackClassName)}>{getInitials(name)}</span>
          )}
          <img
            src={src}
            alt={name}
            className={cn('h-full w-full object-cover', imageLoaded ? 'block' : 'hidden')}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true)
              setImageLoaded(false)
            }}
          />
        </>
      ) : (
        <span className={cn('font-medium', fallbackClassName)}>{getInitials(name)}</span>
      )}
    </div>
  )
}
