import { useState, Children, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type DroppableListProps = {
  id?: string
  children: ReactNode
  onDrop?: (cardId: string, targetIndex: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  className?: string
}

export function DroppableList({
  id,
  children,
  onDrop,
  onDragOver,
  className = '',
}: DroppableListProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
    onDragOver?.(e, index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId && onDrop) {
      onDrop(cardId, index)
    }
  }

  // Convert children to array
  const childrenArray = Children.toArray(children)

  return (
    <div
      id={id}
      className={cn('space-y-2 min-h-[50px]', className)}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const cardId = e.dataTransfer.getData('text/plain')
        // If dropped on the container but not on a child (handled by child's stopPropagation),
        // consider it dropped at the end.
        if (cardId && onDrop) {
          onDrop(cardId, childrenArray.length)
        }
      }}
    >
      {childrenArray.map((child, index) => {
        if (!isValidElement(child)) {
          return child
        }

        return (
          <div
            key={child.key || index}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={cn(
              'transition-colors',
              dragOverIndex === index && 'bg-primary/10 border-2 border-primary/50 rounded-lg p-1 -m-1'
            )}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

