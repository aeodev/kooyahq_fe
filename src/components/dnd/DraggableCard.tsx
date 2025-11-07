import type { ReactNode } from 'react'

type DraggableCardProps = {
  id: string
  children: ReactNode
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  className?: string
}

export function DraggableCard({
  id,
  children,
  onDragStart,
  onDragEnd,
  className = '',
}: DraggableCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.setData('application/json', JSON.stringify({ id }))
    onDragStart?.(id)
    
    const dragElement = e.currentTarget as HTMLElement
    dragElement.style.opacity = '0.5'
    
    // Create a ghost element that looks like the card
    const ghost = dragElement.cloneNode(true) as HTMLElement
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    ghost.style.left = '-9999px'
    ghost.style.width = `${dragElement.offsetWidth}px`
    ghost.style.opacity = '0.8'
    ghost.style.pointerEvents = 'none'
    document.body.appendChild(ghost)
    
    // Calculate offset from where user clicked relative to the card
    const rect = dragElement.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    
    // Use the ghost element with calculated offset so cursor is at click position
    e.dataTransfer.setDragImage(ghost, offsetX, offsetY)
    
    // Clean up ghost after drag starts
    requestAnimationFrame(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost)
      }
    })
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

