import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { cn } from '@/utils/cn'
import type { Task } from '../types'
import type { TicketDetailResponse } from './types'

type TaskTitleSectionProps = {
  editedTask: Task
  ticketDetails: TicketDetailResponse | null
  descriptionExpanded: boolean
  isEditingDescription: boolean
  onToggleDescription: () => void
  onStartEditingDescription: () => void
  onUpdateDescription: (description: string | Record<string, any>) => void
  onCancelEditingDescription: () => void
  onDescriptionChange: (description: string | Record<string, any>) => void
}

export function TaskTitleSection({
  editedTask,
  ticketDetails,
  descriptionExpanded,
  isEditingDescription,
  onToggleDescription,
  onStartEditingDescription,
  onUpdateDescription,
  onCancelEditingDescription,
  onDescriptionChange,
}: TaskTitleSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  
  // Use ticketDetails.ticket.description as source of truth (RichTextDoc)
  const description = ticketDetails?.ticket.description || editedTask.description || {}
  
  // Check if description has content (RichTextDoc is an object)
  const hasDescription = description && typeof description === 'object' && Object.keys(description).length > 0

  return (
    <>
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
          {editedTask.title}
        </h1>
      </div>

      {/* Description */}
      <div>
        <button
          onClick={onToggleDescription}
          className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              descriptionExpanded && 'rotate-90'
            )}
          />
          Description
        </button>
        {descriptionExpanded && (
          <div className="ml-6">
            {isEditingDescription ? (
              <div className="space-y-2">
                <RichTextEditor
                  value={description}
                  onChange={onDescriptionChange}
                  placeholder="Add a description..."
                  onUploadingChange={setIsUploading}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateDescription(description)
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelEditingDescription}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
                {isUploading && (
                  <p className="text-xs text-muted-foreground">
                    Please wait for uploads to complete before saving
                  </p>
                )}
              </div>
            ) : hasDescription ? (
              <RichTextDisplay
                content={description}
                className="prose prose-sm max-w-none text-foreground cursor-pointer hover:opacity-80 transition-opacity"
                onDoubleClick={onStartEditingDescription}
              />
            ) : (
              <div
                onClick={onStartEditingDescription}
                className="prose prose-sm max-w-none text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors italic"
              >
                <p>Add a description...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

