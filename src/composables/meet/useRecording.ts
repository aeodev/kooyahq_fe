import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMeetStore } from '@/stores/meet.store'
import axiosInstance from '@/utils/axios.instance'
import { START_MEET_EGRESS, STOP_MEET_EGRESS, GET_ACTIVE_EGRESS } from '@/utils/api.routes'

interface EgressResponse {
  success: boolean
  data: {
    egressId: string
    status: string
    recordingUrl?: string
    duration?: number
    isRecording?: boolean
  }
}

/**
 * Hook for server-side recording via LiveKit Egress
 * Records directly to S3 - zero RAM usage on the client
 */
export function useRecording(_stream: MediaStream | null, meetId: string | null) {
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const egressIdRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  // Check for active egress when joining a room
  useEffect(() => {
    if (!meetId) return

    const checkActiveEgress = async () => {
      try {
        const response = await axiosInstance.get<EgressResponse>(GET_ACTIVE_EGRESS(meetId))
        if (response.data.success && response.data.data.isRecording) {
          egressIdRef.current = response.data.data.egressId || null
          setIsRecording(true)
          useMeetStore.getState().setRecording(true)
        }
      } catch {
        // No active egress, that's fine
      }
    }

    checkActiveEgress()
  }, [meetId])

  /**
   * Start server-side recording via LiveKit Egress
   * Recording streams directly to S3 - no browser RAM usage
   */
  const startRecording = useCallback(async () => {
    if (!meetId) {
      setError('No meeting ID available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.post<EgressResponse>(START_MEET_EGRESS(meetId))

      if (response.data.success) {
        egressIdRef.current = response.data.data.egressId
        setIsRecording(true)
        useMeetStore.getState().setRecording(true)
      } else {
        throw new Error('Failed to start recording')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      setError(message)
      console.error('[Egress] Failed to start recording:', err)
    } finally {
      setIsLoading(false)
    }
  }, [meetId])

  /**
   * Stop server-side recording
   * The recording file is already in S3
   */
  const stopRecording = useCallback(async () => {
    const egressId = egressIdRef.current
    if (!egressId) {
      setError('No active recording to stop')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axiosInstance.post<EgressResponse>(
        STOP_MEET_EGRESS(egressId),
        { roomName: meetId }
      )

      if (response.data.success) {
        egressIdRef.current = null
        setIsRecording(false)
        useMeetStore.getState().setRecording(false)

        // Recording URL is available in response.data.data.recordingUrl
        if (response.data.data.recordingUrl) {
          console.log('[Egress] Recording saved to:', response.data.data.recordingUrl)
        }

        // Invalidate recordings query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['meet-recordings'] })
      } else {
        throw new Error('Failed to stop recording')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording'
      setError(message)
      console.error('[Egress] Failed to stop recording:', err)
    } finally {
      setIsLoading(false)
    }
  }, [meetId, queryClient])

  return {
    isRecording,
    isUploading: isLoading, // Keep same interface for backward compatibility
    error,
    startRecording,
    stopRecording,
  }
}
