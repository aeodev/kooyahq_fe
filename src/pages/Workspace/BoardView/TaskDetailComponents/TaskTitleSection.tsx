import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { cn } from '@/utils/cn'
import type { Task } from '../types'

export function TaskTitleSection({
  editedTask,
  descriptionExpanded,
  isEditingDescription,
  onToggleDescription,
  onStartEditingDescription,
  onUpdateDescription,
  onCancelEditingDescription,
  onDescriptionChange,
}: TaskTitleSectionProps) {
  const [isUploading, setIsUploading] = useState(false)

type TaskTitleSectionProps = {
  editedTask: Task
  descriptionExpanded: boolean
  isEditingDescription: boolean
  onToggleDescription: () => void
  onStartEditingDescription: () => void
  onUpdateDescription: (description: string) => void
  onCancelEditingDescription: () => void
  onDescriptionChange: (description: string) => void
}

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
                  value={editedTask.description}
                  onChange={onDescriptionChange}
                  placeholder="Add a description..."
                  onUploadingChange={setIsUploading}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateDescription(editedTask.description)
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
            ) : editedTask.description && editedTask.description.trim() !== '' ? (
              <RichTextDisplay
                content={editedTask.description}
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

