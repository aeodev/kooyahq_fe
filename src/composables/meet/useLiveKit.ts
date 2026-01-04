import { useCallback } from 'react'
import { ConnectionState } from 'livekit-client'
import { useAuthStore } from '@/stores/auth.store'
import { useMeetStore } from '@/stores/meet.store'
import { useLiveKitState } from './components/useLiveKitState'
import { useLiveKitIdentity } from './components/useLiveKitIdentity'
import { useLiveKitMirror } from './components/useLiveKitMirror'
import { useLiveKitRoom } from './components/useLiveKitRoom'
import { useLiveKitToggles } from './components/useLiveKitToggles'
import { useLiveKitStreams } from './components/useLiveKitStreams'
import { useLiveKitDevices } from './components/useLiveKitDevices'

export function useLiveKit(
  meetId: string | null,
  initialVideoEnabled = true,
  initialAudioEnabled = true
) {
  const user = useAuthStore((state) => state.user)
  const getStore = useCallback(() => useMeetStore.getState(), [])

  // State management
  const { state, setters, refs, forceUpdate } = useLiveKitState(
    initialVideoEnabled,
    initialAudioEnabled
  )

  // Identity mapping
  const { setIdentityMapping, getDatabaseId, getLiveKitId } =
    useLiveKitIdentity(refs.identityMap)

  // Mirror functionality
  const { cleanupMirror, publishMirroredTrackForRemote } = useLiveKitMirror(
    refs,
    state.isScreenSharing,
    state.isVideoEnabled,
    user?.id || null
  )

  // Cleanup function - stable reference (refs are stable, setters are stable React dispatchers)
  const cleanupRoom = useCallback(() => {
    refs.connectAttempt.current += 1

    const room = refs.room.current
    if (room) {
      room.removeAllListeners()
      room.disconnect()
      refs.room.current = null
    }

    refs.localVideoTrack.current?.stop()
    refs.localVideoTrack.current = null
    refs.localAudioTrack.current?.stop()
    refs.localAudioTrack.current = null

    cleanupMirror()

    refs.remoteStreams.current.clear()
    refs.remoteScreenShares.current.clear()
    refs.identityMap.current.clear()
    
    // Use functional updates to avoid dependency on setters
    setters.setLocalStream(() => null)
    setters.setConnectionState(() => ConnectionState.Disconnected)
    setters.setIsVideoEnabled(() => refs.initialVideo.current)
    setters.setIsAudioEnabled(() => refs.initialAudio.current)
    setters.setIsScreenSharing(() => false)
    setters.setIsMirroredForRemote(() => false)

    // Reset the meet store
    getStore().reset()
  }, [cleanupMirror, getStore]) // cleanupMirror and getStore are stable callbacks

  // Room connection and event handlers
  useLiveKitRoom({
    meetId,
    initialVideoEnabled,
    initialAudioEnabled,
    refs,
    getDatabaseId,
    setIdentityMapping,
    forceUpdate,
    setLocalStream: setters.setLocalStream,
    setConnectionState: setters.setConnectionState,
    setIsVideoEnabled: setters.setIsVideoEnabled,
    setIsAudioEnabled: setters.setIsAudioEnabled,
    setIsScreenSharing: setters.setIsScreenSharing,
    cleanupRoom,
  })

  // Toggle functions
  const { toggleVideo, toggleAudio, toggleScreenShare, toggleMirrorForRemote } =
    useLiveKitToggles({
      refs,
      isVideoEnabled: state.isVideoEnabled,
      isAudioEnabled: state.isAudioEnabled,
      isScreenSharing: state.isScreenSharing,
      isMirroredForRemote: state.isMirroredForRemote,
      setLocalStream: setters.setLocalStream,
      setIsVideoEnabled: setters.setIsVideoEnabled,
      setIsAudioEnabled: setters.setIsAudioEnabled,
      setIsScreenSharing: setters.setIsScreenSharing,
      setIsMirroredForRemote: setters.setIsMirroredForRemote,
      cleanupMirror,
      publishMirroredTrackForRemote,
    })

  // Stream getters
  const { getRemoteStreams, getRemoteScreenShareStream, getLocalScreenShareStream } =
    useLiveKitStreams(
      refs,
      state.isScreenSharing,
      getDatabaseId,
      getLiveKitId
    )

  // Device management
  const { changeVideoDevice, changeAudioInput, changeAudioOutput, flipCamera } =
    useLiveKitDevices(
      refs,
      state.isVideoEnabled,
      state.isAudioEnabled,
      setters.setLocalStream
    )

  return {
    localStream: state.localStream,
    isVideoEnabled: state.isVideoEnabled,
    isAudioEnabled: state.isAudioEnabled,
    isScreenSharing: state.isScreenSharing,
    isMirroredForRemote: state.isMirroredForRemote,
    connectionState: state.connectionState,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMirrorForRemote,
    getRemoteStreams,
    getRemoteScreenShareStream,
    getLocalScreenShareStream,
    streamsUpdateCounter: state.streamsUpdateCounter,
    changeVideoDevice,
    changeAudioInput,
    changeAudioOutput,
    flipCamera,
    cleanup: cleanupRoom,
    getDatabaseId,
    getLiveKitId,
  }
}
