import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type OvertimeConfirmationModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function OvertimeConfirmationModal({ open, onClose, onConfirm }: OvertimeConfirmationModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-md m-4 bg-background/95 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Overtime Work</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            You have already ended your day. Is this overtime work?
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
            >
              Yes, Overtime
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





