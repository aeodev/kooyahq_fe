import { useState, useRef, useEffect } from 'react'
import { Room, LocalVideoTrack, LocalAudioTrack, ConnectionState } from 'livekit-client'

export interface LiveKitState {
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  isMirroredForRemote: boolean
  localStream: MediaStream | null
  streamsUpdateCounter: number
  connectionState: ConnectionState
}

export interface LiveKitRefs {
  room: React.MutableRefObject<Room | null>
  localVideoTrack: React.MutableRefObject<LocalVideoTrack | null>
  localAudioTrack: React.MutableRefObject<LocalAudioTrack | null>
  originalVideoTrack: React.MutableRefObject<LocalVideoTrack | null>
  remoteStreams: React.MutableRefObject<Map<string, MediaStream>>
  remoteScreenShares: React.MutableRefObject<Map<string, MediaStream>>
  connectAttempt: React.MutableRefObject<number>
  identityMap: React.MutableRefObject<Map<string, string>>
  initialVideo: React.MutableRefObject<boolean>
  initialAudio: React.MutableRefObject<boolean>
  mirrorCanvas: React.MutableRefObject<HTMLCanvasElement | null>
  mirrorVideo: React.MutableRefObject<HTMLVideoElement | null>
  mirrorAnimationFrame: React.MutableRefObject<number | null>
}

export function useLiveKitState(
  initialVideoEnabled: boolean,
  initialAudioEnabled: boolean
): {
  state: LiveKitState
  setters: {
    setIsVideoEnabled: React.Dispatch<React.SetStateAction<boolean>>
    setIsAudioEnabled: React.Dispatch<React.SetStateAction<boolean>>
    setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>
    setIsMirroredForRemote: React.Dispatch<React.SetStateAction<boolean>>
    setLocalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>
    setStreamsUpdateCounter: React.Dispatch<React.SetStateAction<number>>
    setConnectionState: React.Dispatch<React.SetStateAction<ConnectionState>>
  }
  refs: LiveKitRefs
  forceUpdate: () => void
} {
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideoEnabled)
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudioEnabled)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isMirroredForRemote, setIsMirroredForRemote] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [streamsUpdateCounter, setStreamsUpdateCounter] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)

  const roomRef = useRef<Room | null>(null)
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null)
  const originalVideoTrackRef = useRef<LocalVideoTrack | null>(null)
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const remoteScreenSharesRef = useRef<Map<string, MediaStream>>(new Map())
  const connectAttemptRef = useRef(0)
  const identityMapRef = useRef<Map<string, string>>(new Map())
  const initialVideoRef = useRef(initialVideoEnabled)
  const initialAudioRef = useRef(initialAudioEnabled)
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null)
  const mirrorAnimationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    initialVideoRef.current = initialVideoEnabled
    initialAudioRef.current = initialAudioEnabled
  }, [initialVideoEnabled, initialAudioEnabled])

  const forceUpdate = () => setStreamsUpdateCounter((v) => v + 1)

  return {
    state: {
      isVideoEnabled,
      isAudioEnabled,
      isScreenSharing,
      isMirroredForRemote,
      localStream,
      streamsUpdateCounter,
      connectionState,
    },
    setters: {
      setIsVideoEnabled,
      setIsAudioEnabled,
      setIsScreenSharing,
      setIsMirroredForRemote,
      setLocalStream,
      setStreamsUpdateCounter,
      setConnectionState,
    },
    refs: {
      room: roomRef,
      localVideoTrack: localVideoTrackRef,
      localAudioTrack: localAudioTrackRef,
      originalVideoTrack: originalVideoTrackRef,
      remoteStreams: remoteStreamsRef,
      remoteScreenShares: remoteScreenSharesRef,
      connectAttempt: connectAttemptRef,
      identityMap: identityMapRef,
      initialVideo: initialVideoRef,
      initialAudio: initialAudioRef,
      mirrorCanvas: mirrorCanvasRef,
      mirrorVideo: mirrorVideoRef,
      mirrorAnimationFrame: mirrorAnimationFrameRef,
    },
    forceUpdate,
  }
}

