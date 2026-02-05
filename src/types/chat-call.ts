export type CallMode = 'one_to_one' | 'group'

export type CallMedia = 'audio' | 'video'

export type CallStatus =
  | 'idle'
  | 'ringing_outgoing'
  | 'ringing_incoming'
  | 'connecting'
  | 'active'
  | 'ending'
  | 'ended'
  | 'failed'

export type CallParticipantStatus = 'ringing' | 'connected' | 'left'

export type CallParticipant = {
  userId: string
  status: CallParticipantStatus
}

export type CallSessionPayload = {
  callId: string
  roomId: string
  mode: CallMode
  media: CallMedia
  initiatorId: string
  participants: CallParticipant[]
  status: 'ringing' | 'active' | 'ended'
}
