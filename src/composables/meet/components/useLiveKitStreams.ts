import { useCallback } from 'react'
import { Track } from 'livekit-client'
import type { LiveKitRefs } from './useLiveKitState'

export function useLiveKitStreams(
  refs: LiveKitRefs,
  isScreenSharing: boolean,
  getDatabaseId: (liveKitId: string) => string,
  getLiveKitId: (databaseId: string) => string | undefined
) {
  const getRemoteStreams = useCallback(() => {
    const streams: Array<{ userId: string; stream: MediaStream }> = []
    refs.remoteStreams.current.forEach((stream, liveKitId) => {
      if (stream?.getTracks().length) {
        const databaseId = getDatabaseId(liveKitId)
        streams.push({ userId: databaseId, stream })
      }
    })
    return streams
  }, [refs, getDatabaseId])

  const getRemoteScreenShareStream = useCallback(
    (userId: string): MediaStream | null => {
      const liveKitId = getLiveKitId(userId)
      if (liveKitId) {
        const stream = refs.remoteScreenShares.current.get(liveKitId)
        if (stream?.getTracks().length) {
          return stream
        }
      }
      const directStream = refs.remoteScreenShares.current.get(userId)
      if (directStream?.getTracks().length) {
        return directStream
      }
      return null
    },
    [refs, getLiveKitId]
  )

  const getLocalScreenShareStream = useCallback((): MediaStream | null => {
    const room = refs.room.current
    if (!room || !isScreenSharing) return null

    const screenPub = room.localParticipant.getTrackPublication(
      Track.Source.ScreenShare
    )
    if (screenPub?.track) {
      return new MediaStream([screenPub.track.mediaStreamTrack])
    }
    return null
  }, [refs, isScreenSharing])

  return {
    getRemoteStreams,
    getRemoteScreenShareStream,
    getLocalScreenShareStream,
  }
}

