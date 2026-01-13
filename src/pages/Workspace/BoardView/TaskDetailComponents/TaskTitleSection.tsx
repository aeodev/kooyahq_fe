import { useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  isEditingTitle: boolean
  titleValue: string
  isDisabled?: boolean
  onToggleDescription: () => void
  onStartEditingDescription: () => void
  onStartEditingTitle: () => void
  onUpdateDescription: (descriptionHtml: string) => void
  onUpdateTitle: (title: string) => void
  onCancelEditingDescription: () => void
  onCancelEditingTitle: () => void
  onDescriptionChange: (descriptionHtml: string) => void
  onTitleChange: (title: string) => void
}

export function TaskTitleSection({
  editedTask,
  ticketDetails,
  descriptionExpanded,
  isEditingDescription,
  isEditingTitle,
  titleValue,
  isDisabled = false,
  onToggleDescription,
  onStartEditingDescription,
  onStartEditingTitle,
  onUpdateDescription,
  onUpdateTitle,
  onCancelEditingDescription,
  onCancelEditingTitle,
  onDescriptionChange,
  onTitleChange,
}: TaskTitleSectionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const skipTitleCommitRef = useRef(false)
  
  // Use ticketDetails.ticket.description as source of truth (RichTextDoc)
  const description = ticketDetails?.ticket.description || editedTask.description || {}
  const descriptionHtml = richTextDocToHtml(description)
  const hasDescription = hasRichTextContent(description)
  const canEdit = !isDisabled

  return (
    <>
      {/* Title */}
      <div>
        {isEditingTitle ? (
          <Input
            value={titleValue}
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={() => {
              if (skipTitleCommitRef.current) {
                skipTitleCommitRef.current = false
                return
              }
              onUpdateTitle(titleValue)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                skipTitleCommitRef.current = true
                onCancelEditingTitle()
              }
            }}
            autoFocus
            disabled={!canEdit}
            className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-xl sm:text-2xl font-semibold text-foreground leading-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        ) : (
          <h1
            className={cn(
              'text-xl sm:text-2xl font-semibold text-foreground leading-tight',
              canEdit && 'cursor-text hover:opacity-80 transition-opacity'
            )}
            onDoubleClick={() => {
              if (!canEdit) return
              onStartEditingTitle()
            }}
          >
            {editedTask.title}
          </h1>
        )}
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
                  className={cn(isDisabled && 'pointer-events-none opacity-60')}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateDescription(descriptionHtml)
                    }}
                    disabled={isUploading || isDisabled}
                  >
                    {isUploading ? 'Uploading...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelEditingDescription}
                    disabled={isUploading || isDisabled}
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
                onDoubleClick={() => {
                  if (!canEdit) return
                  onStartEditingDescription()
                }}
              />
            ) : (
              <div
                onClick={() => {
                  if (!canEdit) return
                  onStartEditingDescription()
                }}
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
