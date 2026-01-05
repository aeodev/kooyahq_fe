import { useEffect } from 'react'
import { Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetInvitations } from '@/composables/meet/useMeetInvitations'

export function MeetInvitationToast() {
  const { invitation, acceptInvitation, declineInvitation } = useMeetInvitations()

  // Auto-decline after 30 seconds
  useEffect(() => {
    if (!invitation) return

    const timer = setTimeout(() => {
      declineInvitation()
    }, 30000) // 30 seconds

    return () => {
      clearTimeout(timer)
    }
  }, [invitation, declineInvitation])

  if (!invitation) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md">
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1">Meeting Invitation</h3>
            <p className="text-xs text-muted-foreground">
              {invitation.fromUserName} invited you to join a meeting
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={declineInvitation}
            className="h-6 w-6 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={declineInvitation}
            className="flex-1 text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            onClick={acceptInvitation}
            className="flex-1 text-xs h-8"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}

