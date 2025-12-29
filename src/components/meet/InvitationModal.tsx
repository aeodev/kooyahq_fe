import { X, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetInvitations } from '@/composables/meet/useMeetInvitations'

export function InvitationModal() {
  const { invitation, acceptInvitation, declineInvitation } = useMeetInvitations()

  if (!invitation) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Meeting Invitation</h2>
              <p className="text-sm text-muted-foreground">
                {invitation.fromUserName} invited you to join a meeting
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={declineInvitation}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={declineInvitation}
            className="flex-1"
          >
            Decline
          </Button>
          <Button
            onClick={acceptInvitation}
            className="flex-1"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}

