import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketStore } from '@/stores/socket.store'

export interface MeetInvitation {
  fromUserId: string
  fromUserName: string
  meetId: string
}

export function useMeetInvitations() {
  const navigate = useNavigate()
  const socket = useSocketStore((state) => state.socket)
  const [invitation, setInvitation] = useState<MeetInvitation | null>(null)
  const pendingInvitationsRef = useRef<Map<string, string>>(new Map()) // userId -> meetId

  // Listen for incoming invitations
  useEffect(() => {
    if (!socket?.connected) return

    const handleInvitation = (data: { fromUserId: string; fromUserName: string; meetId: string }) => {
      // Replace any existing invitation with the new one
      setInvitation({
        fromUserId: data.fromUserId,
        fromUserName: data.fromUserName,
        meetId: data.meetId,
      })
    }

    const handleInvitationAccepted = (data: { acceptedByUserId: string; meetId: string }) => {
      const pendingMeetId = pendingInvitationsRef.current.get(data.acceptedByUserId)
      if (pendingMeetId && pendingMeetId === data.meetId) {
        navigate(`/meet/${data.meetId}`)
        pendingInvitationsRef.current.delete(data.acceptedByUserId)
      }
    }

    socket.on('meet:invitation', handleInvitation)
    socket.on('meet:invitation-accepted', handleInvitationAccepted)

    return () => {
      socket.off('meet:invitation', handleInvitation)
      socket.off('meet:invitation-accepted', handleInvitationAccepted)
    }
  }, [socket, socket?.connected, navigate])

  const sendInvitation = useCallback(
    (meetId: string, invitedUserId: string) => {
      if (!socket?.connected) {
        alert('Socket not connected. Please wait a moment.')
        return
      }

      socket.emit('meet:invite', { meetId, invitedUserId })
      pendingInvitationsRef.current.set(invitedUserId, meetId)
    },
    [socket]
  )

  const acceptInvitation = useCallback(
    () => {
      if (!socket?.connected || !invitation) {
        return
      }

      socket.emit('meet:accept-invitation', {
        meetId: invitation.meetId,
        fromUserId: invitation.fromUserId,
      })

      navigate(`/meet/${invitation.meetId}`)
      setInvitation(null)
    },
    [socket, invitation, navigate]
  )

  const declineInvitation = useCallback(() => {
    if (!socket?.connected || !invitation) {
      return
    }

    socket.emit('meet:decline-invitation', {
      meetId: invitation.meetId,
      fromUserId: invitation.fromUserId,
    })

    setInvitation(null)
  }, [socket, invitation])

  const clearInvitation = useCallback(() => {
    setInvitation(null)
  }, [])

  return {
    invitation,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    clearInvitation,
  }
}

