import { cn } from '@/utils/cn'
import type { User } from '@/types/user'

type StatusType = User['status']

interface StatusIndicatorProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusColors = {
  online: 'bg-green-500',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-500',
} as const

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export function StatusIndicator({ status, size = 'md', className }: StatusIndicatorProps) {
  const statusColor = statusColors[status || 'offline']

  return (
    <span className={cn('relative inline-flex rounded-full ring-2 ring-[hsl(var(--ios-sidebar-bg))]', className)}>
      <span className={cn('relative inline-flex rounded-full', sizeClasses[size], statusColor)} />
    </span>
  )
}

export function StatusDot({ status, size = 'md', className }: StatusIndicatorProps) {
  const statusColor = statusColors[status || 'offline']

  return (
    <span className={cn('relative inline-flex rounded-full', sizeClasses[size], statusColor, className)} />
  )
}