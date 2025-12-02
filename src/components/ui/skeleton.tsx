import { cn } from '@/utils/cn'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('animate-pulse rounded-md bg-muted block', className)}
      {...props}
    />
  )
}

export { Skeleton }



