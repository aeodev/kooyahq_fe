import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DraggableFieldConfigItem } from './DraggableFieldConfigItem'
import axiosInstance from '@/utils/axios.instance'
import { UPDATE_TICKET_DETAILS_SETTINGS, RESET_TICKET_DETAILS_SETTINGS } from '@/utils/api.routes'

type FieldConfig = {
  fieldName: string
  isVisible: boolean
  order: number
}

type DetailsSettingsDropdownProps = {
  detailsSettings: {
    fieldConfigs: FieldConfig[]
  } | null
  setDetailsSettings: (settings: { fieldConfigs: FieldConfig[] } | null) => void
  boardId: string | undefined
}

export function DetailsSettingsDropdown({
  detailsSettings,
  setDetailsSettings,
  boardId,
}: DetailsSettingsDropdownProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleVisibility = (fieldName: string, isVisible: boolean) => {
    if (detailsSettings) {
      const updated = {
        ...detailsSettings,
        fieldConfigs: detailsSettings.fieldConfigs.map((fc) =>
          fc.fieldName === fieldName ? { ...fc, isVisible } : fc
        ),
      }
      setDetailsSettings(updated)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex || !detailsSettings) return

    const updated = { ...detailsSettings }
    const sortedConfigs = [...updated.fieldConfigs].sort((a, b) => a.order - b.order)
    const draggedItem = sortedConfigs[draggedIndex]

    // Remove dragged item
    sortedConfigs.splice(draggedIndex, 1)

    // Insert at new position
    sortedConfigs.splice(dropIndex, 0, draggedItem)

    // Update orders
    sortedConfigs.forEach((config, index) => {
      config.order = index
    })

    updated.fieldConfigs = sortedConfigs
    setDetailsSettings(updated)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleReset = async () => {
    if (boardId) {
      try {
        setIsSaving(true)
        const response = await axiosInstance.post<{
          success: boolean
          data: { fieldConfigs: FieldConfig[] }
        }>(RESET_TICKET_DETAILS_SETTINGS(boardId))
        if (response.data.success && response.data.data) {
          setDetailsSettings(response.data.data)
        }
      } catch (error) {
        console.error('Error resetting settings:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleSave = async () => {
    if (detailsSettings && boardId) {
      try {
        setIsSaving(true)
        const response = await axiosInstance.put<{
          success: boolean
          data: { fieldConfigs: FieldConfig[] }
        }>(UPDATE_TICKET_DETAILS_SETTINGS(), {
          boardId,
          fieldConfigs: detailsSettings.fieldConfigs,
        })
        
        if (response.data.success && response.data.data) {
          // Update local state with saved settings
          setDetailsSettings(response.data.data)
          // Close dropdown after successful save
          setIsOpen(false)
        }
      } catch (error) {
        console.error('Error saving settings:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const sortedConfigs = detailsSettings?.fieldConfigs
    ? [...detailsSettings.fieldConfigs].sort((a, b) => a.order - b.order)
    : []

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto" align="end">
        <div className="p-3 space-y-3">
          <div className="text-sm font-semibold">Configure Details Fields</div>
          <div className="text-xs text-muted-foreground">
            Choose which fields to display and arrange their order.
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedConfigs.map((config, index) => (
              <DraggableFieldConfigItem
                key={config.fieldName}
                config={config}
                index={index}
                isDragging={draggedIndex === index}
                onToggleVisibility={handleToggleVisibility}
                onDragStart={handleDragStart}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

