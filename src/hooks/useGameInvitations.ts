import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '@/stores/socket.store'
import type { ActiveUser } from '@/types/game'

export interface GameInvitation {
  fromUserId: string
  fromUserName: string
  gameType: string
}

interface UseGameInvitationsOptions {
  activeUsers?: ActiveUser[]
}

export function useGameInvitations(options?: UseGameInvitationsOptions) {
  const navigate = useNavigate()
  const socket = useSocketStore((state) => state.socket)
  const activeUsers = options?.activeUsers || []
  
  const [invitation, setInvitation] = useState<GameInvitation | null>(null)
  const pendingInvitationsRef = useRef<Map<string, { invitedUserId: string; gameType: string }>>(new Map())

  // Listen for incoming invitations
  useEffect(() => {
    if (!socket?.connected) return

    const handleInvitation = (data: { fromUserId: string; gameType: string }) => {
      const inviter = activeUsers.find((u) => u.id === data.fromUserId)
      setInvitation({
        fromUserId: data.fromUserId,
        fromUserName: inviter?.name || 'Someone',
        gameType: data.gameType,
      })
    }

    const handleInvitationAccepted = (data: { acceptedByUserId: string; gameType: string }) => {
      const pendingInvite = pendingInvitationsRef.current.get(data.acceptedByUserId)
      if (pendingInvite && pendingInvite.gameType === data.gameType) {
        navigate(`/games/play/${data.gameType}?opponent=${data.acceptedByUserId}`)
        pendingInvitationsRef.current.delete(data.acceptedByUserId)
      }
    }

    socket.on('game:invitation', handleInvitation)
    socket.on('game:invitation-accepted', handleInvitationAccepted)

    return () => {
      socket.off('game:invitation', handleInvitation)
      socket.off('game:invitation-accepted', handleInvitationAccepted)
    }
  }, [socket, activeUsers, navigate])

  const sendInvitation = useCallback(
    (gameType: string, invitedUserId: string) => {
      if (!socket?.connected) {
        alert('Socket not connected. Please wait a moment.')
        return
      }

      socket.emit('game:invite', { gameType, invitedUserId })
      pendingInvitationsRef.current.set(invitedUserId, { invitedUserId, gameType })
    },
    [socket]
  )

  const acceptInvitation = useCallback(() => {
    if (!socket?.connected || !invitation) {
      return
    }

    socket.emit('game:accept-invitation', {
      fromUserId: invitation.fromUserId,
      gameType: invitation.gameType,
    })

    navigate(`/games/play/${invitation.gameType}?opponent=${invitation.fromUserId}`)
    setInvitation(null)
  }, [socket, invitation, navigate])

  const declineInvitation = useCallback(() => {
    setInvitation(null)
  }, [])

  return {
    invitation,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
  }
}

