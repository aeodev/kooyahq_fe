import { cn } from '@/utils/cn'
import { isValidImageUrl } from '@/utils/formatters'
import { getInitialsFallback } from '@/utils/image.utils'
import type { Assignee } from './types'

type AssigneeAvatarProps = {
  assignee?: Assignee | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
  title?: string
}

const SIZE_CLASSES: Record<NonNullable<AssigneeAvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
}

export function AssigneeAvatar({ assignee, size = 'sm', className, title }: AssigneeAvatarProps) {
  if (!assignee) return null

  const sizeClass = SIZE_CLASSES[size]
  const label = title ?? assignee.name

  if (isValidImageUrl(assignee.avatar)) {
    return (
      <img
        src={assignee.avatar}
        alt={assignee.name}
        title={label}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
        onError={(e) => {
          const target = e.currentTarget
          target.onerror = null
          target.src = getInitialsFallback(assignee.name)
        }}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white flex-shrink-0',
        sizeClass,
        assignee.color,
        className
      )}
      title={label}
    >
      {assignee.initials}
    </div>
  )
}
