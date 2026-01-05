import { RemoteParticipant, Track } from 'livekit-client'

export function getParticipantState(participant: RemoteParticipant) {
  let isVideoEnabled = false
  let isAudioEnabled = false
  let isScreenSharing = false

  participant.trackPublications.forEach((pub) => {
    if (pub.source === Track.Source.Camera && !pub.isMuted) {
      isVideoEnabled = true
    }
    if (pub.source === Track.Source.Microphone && !pub.isMuted) {
      isAudioEnabled = true
    }
    if (pub.source === Track.Source.ScreenShare && !pub.isMuted) {
      isScreenSharing = true
    }
  })

  return { isVideoEnabled, isAudioEnabled, isScreenSharing }
}


