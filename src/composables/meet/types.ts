// Shared types for Meet WebRTC

export interface PeerConnection {
  peerConnection: RTCPeerConnection
  stream: MediaStream | null
}

export interface SignalingData {
  fromUserId: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export interface ParticipantJoinData {
  userId: string
  userName?: string
  profilePic?: string
  meetId: string
}

export interface ParticipantStateData {
  userId: string
  meetId: string
  isVideoEnabled?: boolean
  isAudioEnabled?: boolean
  isScreenSharing?: boolean
}

export interface ExistingParticipantsData {
  meetId: string
  participants: Array<{
    userId: string
    userName?: string
    profilePic?: string
  }>
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN servers for better connectivity across networks
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
}




