import { useState } from 'react'
import type { ReactNode } from 'react'

type DroppableColumnProps = {
  id: string
  children: ReactNode
  onDrop: (cardId: string, targetColumnId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  className?: string
}

export function DroppableColumn({
  id,
  children,
  onDrop,
  onDragOver,
  className = '',
}: DroppableColumnProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDraggingOver(true)
    onDragOver?.(e)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId) {
      onDrop(cardId, id)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-colors ${isDraggingOver ? 'bg-muted/50' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

