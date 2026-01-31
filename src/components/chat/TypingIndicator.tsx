import { cn } from '@/utils/cn'

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 px-4 py-2', className)}>
      <div className="flex gap-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted-foreground ml-2">typing...</span>
    </div>
  )
}
