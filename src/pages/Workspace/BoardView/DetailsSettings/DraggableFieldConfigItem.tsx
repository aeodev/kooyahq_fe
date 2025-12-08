import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { cn } from '@/utils/cn'

type FieldConfig = {
  fieldName: string
  isVisible: boolean
  order: number
}

type DraggableFieldConfigItemProps = {
  config: FieldConfig
  index: number
  isDragging: boolean
  onToggleVisibility: (fieldName: string, isVisible: boolean) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

export function DraggableFieldConfigItem({
  config,
  index,
  isDragging,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: DraggableFieldConfigItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
    onDragOver(e, index)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    onDrop(e, index)
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-3 p-2 border rounded-md cursor-move transition-all',
        isDragging && 'opacity-50',
        isDragOver && 'border-primary bg-primary/5'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <input
        type="checkbox"
        checked={config.isVisible}
        onChange={(e) => onToggleVisibility(config.fieldName, e.target.checked)}
        className="h-4 w-4 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      <span className="flex-1 text-xs capitalize">
        {config.fieldName.replace(/([A-Z])/g, ' $1').trim()}
      </span>
    </div>
  )
}

