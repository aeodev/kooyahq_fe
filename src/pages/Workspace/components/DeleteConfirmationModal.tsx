import { AlertTriangle, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useDeleteBoard } from '@/hooks/board.hooks'
import { useState } from 'react'

type DeleteConfirmationModalProps = {
  open: boolean
  onClose: () => void
  boardName: string
  boardId: string
  onConfirm: (boardId: string) => void
}

export function DeleteConfirmationModal({
  open,
  onClose,
  boardName,
  boardId,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const { deleteBoard, loading, error } = useDeleteBoard()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setDeleteError(null)
    const success = await deleteBoard(boardId)
    
    if (success) {
      onConfirm(boardId)
      onClose()
    } else {
      const errorMessage = Array.isArray(error?.message) ? error?.message.join(', ') : error?.message
      setDeleteError(errorMessage || 'Failed to delete board')
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Delete board</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{boardName}"</span>?
          </p>
          <p className="text-sm text-destructive">
            This action cannot be undone. All cards and data associated with this board will be permanently deleted.
          </p>
          {deleteError && (
            <p className="text-sm text-destructive font-medium">{deleteError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete board'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}



