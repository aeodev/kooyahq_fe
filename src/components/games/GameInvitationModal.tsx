import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

type GameInvitationModalProps = {
  open: boolean
  fromUserName: string
  gameType: string
  onAccept: () => void
  onDecline: () => void
}

export function GameInvitationModal({
  open,
  fromUserName,
  gameType,
  onAccept,
  onDecline,
}: GameInvitationModalProps) {
  const gameDisplayName = gameType === 'tic-tac-toe' ? 'Tic Tac Toe' : gameType

  return (
    <Modal open={open} onClose={onDecline} maxWidth="md">
      <CardHeader>
        <CardTitle>Game Invitation</CardTitle>
        <CardDescription>
          {fromUserName} invited you to play {gameDisplayName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={onAccept}>Accept</Button>
        </div>
      </CardContent>
    </Modal>
  )
}

