import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { cn } from '@/utils/cn'
import { richTextDocToHtml, hasRichTextContent } from '@/utils/rich-text'
import type { Task } from '../types'
import type { TicketDetailResponse } from './types'

type TaskTitleSectionProps = {
  editedTask: Task
  ticketDetails: TicketDetailResponse | null
  descriptionExpanded: boolean
  isEditingDescription: boolean
  onToggleDescription: () => void
  onStartEditingDescription: () => void
  onUpdateDescription: (descriptionHtml: string) => void
  onCancelEditingDescription: () => void
  onDescriptionChange: (descriptionHtml: string) => void
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
  const descriptionHtml = richTextDocToHtml(description)
  const hasDescription = hasRichTextContent(description)

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
                  value={descriptionHtml}
                  onChange={onDescriptionChange}
                  placeholder="Add a description..."
                  onUploadingChange={setIsUploading}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateDescription(descriptionHtml)
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
                content={descriptionHtml}
                className="text-foreground cursor-pointer hover:opacity-80 transition-opacity"
                onDoubleClick={onStartEditingDescription}
              />
            ) : (
              <div
                onClick={onStartEditingDescription}
                className="text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors italic"
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
