import { useState, Children, isValidElement } from 'react'
import { cn } from '@/utils/cn'

type DroppableColumnContainerProps = {
  children: React.ReactNode
  onColumnDrop?: (columnId: string, targetIndex: number) => void
  className?: string
}

export function DroppableColumnContainer({
  children,
  onColumnDrop,
  className = '',
}: DroppableColumnContainerProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only handle column drags, not card drags
    const data = e.dataTransfer.getData('text/plain')
    if (!data.startsWith('column:')) {
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
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
    
    const data = e.dataTransfer.getData('text/plain')
    if (!data.startsWith('column:')) {
      return
    }
    
    const columnId = data.replace('column:', '')
    setDragOverIndex(null)
    
    if (onColumnDrop && columnId) {
      onColumnDrop(columnId, index)
    }
  }

  const childrenArray = Children.toArray(children)

  return (
    <div className={cn('flex gap-2', className)}>
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
              'transition-all w-full',
              dragOverIndex === index && 'ring-2 ring-primary/50 rounded-lg'
            )}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

