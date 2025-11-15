import type { ReactNode } from 'react'

type DraggableColumnProps = {
  id: string
  children: ReactNode
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  className?: string
}

export function DraggableColumn({
  id,
  children,
  onDragStart,
  onDragEnd,
  className = '',
}: DraggableColumnProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation() // Prevent any bubbling
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `column:${id}`)
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'column', id }))
    onDragStart?.(id)
    
    const dragElement = e.currentTarget as HTMLElement
    dragElement.style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement
    element.style.opacity = '1'
    onDragEnd?.()
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-grab active:cursor-grabbing transition-opacity ${className}`}
    >
      {children}
    </div>
  )
}

