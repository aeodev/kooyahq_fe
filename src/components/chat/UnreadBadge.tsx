import { cn } from '@/utils/cn'

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null

  return (
    <span
      className={cn(
        'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
