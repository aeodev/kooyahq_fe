import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import {
  GET_MEET_RECORDINGS,
  GET_MEET_RECORDING,
  GET_MEET_RECORDING_ANALYSIS,
} from '@/utils/api.routes'

export interface MeetRecording {
  id: string
  meetId: string
  userId: string
  recordingUrl: string
  cloudinaryPublicId?: string
  duration: number
  startTime: string
  endTime: string
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  analysisId?: string
  createdAt: string
  updatedAt: string
}

export interface MeetAnalysis {
  id: string
  recordingId: string
  transcription: string
  summary: string
  actionItems: string[]
  keyPoints: string[]
  createdAt: string
  completedAt?: string
}

export function useMeetRecordings() {
  return useQuery<MeetRecording[]>({
    queryKey: ['meet-recordings'],
    queryFn: async () => {
      const response = await axiosInstance.get(GET_MEET_RECORDINGS())
      return response.data.data
    },
  })
}

export function useMeetRecording(id: string | null) {
  return useQuery<MeetRecording>({
    queryKey: ['meet-recording', id],
    queryFn: async () => {
      if (!id) throw new Error('Recording ID is required')
      const response = await axiosInstance.get(GET_MEET_RECORDING(id))
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useMeetRecordingAnalysis(recordingId: string | null) {
  return useQuery<MeetAnalysis>({
    queryKey: ['meet-recording-analysis', recordingId],
    queryFn: async () => {
      if (!recordingId) throw new Error('Recording ID is required')
      const response = await axiosInstance.get(GET_MEET_RECORDING_ANALYSIS(recordingId))
      return response.data.data
    },
    enabled: !!recordingId,
  })
}

