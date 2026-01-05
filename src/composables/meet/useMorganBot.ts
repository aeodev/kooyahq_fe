import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocalAudioTrack } from 'livekit-client'
import { useMorganAI } from './useMorganAI'
import { useMeetStore, type Participant } from '@/stores/meet.store'
import { useSocketStore } from '@/stores/socket.store'
import morganAvatar from '@/assets/icons8-meeting-100.png'

interface UseMorganBotParams {
  enabledByDefault?: boolean
  getRoom: () => import('livekit-client').Room | null
}

type MorganParticipant = Participant & { isSpeaking?: boolean }

const MORGAN_ID = 'morgan-bot'
const MORGAN_NAME = 'Morgan AI'

/**
 * Decode base64 audio string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Morgan AI Bot Hook
 * 
 * Manages Morgan's presence in a meeting:
 * - Creates AudioContext for audio routing
 * - Publishes audio to LiveKit
 * - Plays TTS responses from backend
 * - Manages participant presence in store
 */
export function useMorganBot({ enabledByDefault = false, getRoom }: UseMorganBotParams) {
  // === SOCKET & MEET STATE ===
  const socket = useSocketStore((state) => state.socket)
  const meetId = useMeetStore((state) => state.meetId)

  // === STATE (for external consumers only) ===
  const [error, setError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)

  // === REFS (for internal sync - avoids race conditions) ===
  const audioContextRef = useRef<AudioContext | null>(null)
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const audioTrackRef = useRef<LocalAudioTrack | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const getRoomRef = useRef(getRoom)
  const playAudioRef = useRef<((audioBase64: string) => Promise<void>) | null>(null)
  
  // Keep getRoom ref updated
  getRoomRef.current = getRoom

  // === STATIC PARTICIPANT (memoized to avoid effect re-runs) ===
  const participant: MorganParticipant = useMemo(() => ({
    userId: MORGAN_ID,
    userName: MORGAN_NAME,
    profilePic: morganAvatar,
    isVideoEnabled: false,
    isAudioEnabled: true,
    isScreenSharing: false,
    isSpeaking: false,
  }), [])

  // === CORE AUDIO FUNCTIONS ===

  /**
   * Create AudioContext and destination node (synchronous)
   * Returns the MediaStream immediately - no async waiting
   */
  const createAudioContext = useCallback((): MediaStream | null => {
    // Return existing if already created
    if (audioContextRef.current && destinationRef.current) {
      return destinationRef.current.stream
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      audioContextRef.current = ctx
      destinationRef.current = ctx.createMediaStreamDestination()
      
      console.log('[MorganBot] AudioContext created, stream ready')
      return destinationRef.current.stream
    } catch (err) {
      console.error('[MorganBot] Failed to create AudioContext:', err)
      setError('Audio not supported')
      return null
    }
  }, [])

  /**
   * Publish Morgan's audio track to LiveKit room
   */
  const publishAudioTrack = useCallback(async () => {
    const room = getRoomRef.current()
    
    // Skip if no room, already published, or no destination
    if (!room || audioTrackRef.current || !destinationRef.current) {
      return
    }

    const track = destinationRef.current.stream.getAudioTracks()[0]
    if (!track) {
      console.warn('[MorganBot] No audio track available to publish')
      return
    }

    try {
      setIsPublishing(true)
      const localTrack = new LocalAudioTrack(track)
      await room.localParticipant.publishTrack(localTrack)
      audioTrackRef.current = localTrack
      console.log('[MorganBot] Audio track published to LiveKit')
    } catch (err) {
      console.error('[MorganBot] Failed to publish audio track:', err)
      setError('Could not publish Morgan audio')
    } finally {
      setIsPublishing(false)
    }
  }, [])

  /**
   * Play base64-encoded audio through AudioContext
   * Routes to both LiveKit (for other participants) and local output (for current user)
   */
  const playAudioToLiveKit = useCallback(async (audioBase64: string): Promise<void> => {
    const ctx = audioContextRef.current
    const dest = destinationRef.current
    
    if (!ctx || !dest) {
      console.error('[MorganBot] AudioContext not available for playback')
      return
    }

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    try {
      // Decode base64 to audio buffer
      const arrayBuffer = base64ToArrayBuffer(audioBase64)
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      
      // Stop any currently playing audio
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop()
        } catch {
          // Ignore if already stopped
        }
        currentSourceRef.current = null
      }
      
      // Create and connect audio nodes
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      
      const gainNode = ctx.createGain()
      gainNode.gain.value = 1.0
      
      source.connect(gainNode)
      gainNode.connect(dest)           // Route to LiveKit
      gainNode.connect(ctx.destination) // Route to local speakers
      
      currentSourceRef.current = source
      source.start()
      
      console.log('[MorganBot] Playing audio, duration:', audioBuffer.duration.toFixed(1), 's')
      
      // Return promise that resolves when audio ends
      return new Promise<void>(resolve => {
        source.onended = () => {
          currentSourceRef.current = null
          resolve()
        }
      })
    } catch (err) {
      console.error('[MorganBot] Failed to play audio:', err)
      setError('Failed to play Morgan audio')
    }
  }, [])

  // Store playAudio ref for use in useMorganAI callback
  playAudioRef.current = playAudioToLiveKit

  /**
   * Cleanup all audio resources
   */
  const cleanup = useCallback(() => {
    console.log('[MorganBot] Cleaning up...')
    
    // 1. Stop current playback
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch {
        // Ignore
      }
      currentSourceRef.current = null
    }
    
    // 2. Unpublish from LiveKit
    const room = getRoomRef.current()
    const localTrack = audioTrackRef.current
    if (room && localTrack) {
      room.localParticipant.unpublishTrack(localTrack).catch(() => {})
    }
    if (localTrack) {
      localTrack.stop()
    }
    audioTrackRef.current = null
    
    // 3. Close AudioContext
    const ctx = audioContextRef.current
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => {})
    }
    audioContextRef.current = null
    destinationRef.current = null
    
    // 4. Clear state
    setAudioStream(null)
    
    // 5. Remove from participants store
    useMeetStore.getState().removeParticipant(MORGAN_ID)
  }, [])

  // === MORGAN AI HOOK ===
  const {
    isActive,
    state: aiState,
    error: aiError,
    toggle,
  } = useMorganAI({
    enabled: enabledByDefault,
    wakeWord: 'hey morgan',
    onSpeak: async (audioBase64) => {
      // Ensure audio track is published before playing
      await publishAudioTrack()
      // Play the audio
      if (playAudioRef.current) {
        await playAudioRef.current(audioBase64)
      }
    },
  })

  // === LIFECYCLE EFFECT (single consolidated effect) ===
  useEffect(() => {
    if (!isActive) {
      return
    }

    console.log('[MorganBot] Activating Morgan...')
    
    // 1. Create AudioContext (synchronous - stream immediately available)
    const stream = createAudioContext()
    if (!stream) {
      console.error('[MorganBot] Failed to create audio stream')
      return
    }
    
    // 2. Set state for external consumers (e.g., Meet page's mergedStreams)
    setAudioStream(stream)
    
    // 3. Add Morgan to participants store
    useMeetStore.getState().addParticipant(participant)
    console.log('[MorganBot] Morgan added to participants')
    
    // 4. Publish audio track to LiveKit (async, fire-and-forget)
    publishAudioTrack()

    // 5. Broadcast Morgan activation to other users in the room
    if (socket?.connected && meetId) {
      socket.emit('meet:morgan-toggle', { meetId, isActive: true })
      console.log('[MorganBot] Broadcasted activation to room')
    }

    // Cleanup when deactivated or unmounted
    return () => {
      // Broadcast Morgan deactivation to other users
      if (socket?.connected && meetId) {
        socket.emit('meet:morgan-toggle', { meetId, isActive: false })
        console.log('[MorganBot] Broadcasted deactivation to room')
      }
      cleanup()
    }
  }, [isActive, participant, createAudioContext, publishAudioTrack, cleanup, socket, meetId])

  // === SYNC AI ERRORS ===
  useEffect(() => {
    setError(aiError || null)
  }, [aiError])

  // === DERIVED VALUES ===
  const morganParticipant: MorganParticipant = useMemo(() => ({
    ...participant,
    isSpeaking: aiState === 'speaking',
  }), [participant, aiState])

  return {
    isActive,
    aiState,
    isPublishing,
    error,
    toggleMorgan: toggle,
    morganParticipant,
    morganAudioStream: audioStream,
  }
}
