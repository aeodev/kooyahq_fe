import axiosInstance from './axios.instance'
import { GET_LIVEKIT_TOKEN } from './api.routes'

export interface LiveKitTokenResponse {
  status: string
  data: {
    token: string
    url: string
  }
}

export async function fetchLiveKitToken(roomName: string): Promise<LiveKitTokenResponse> {
  const response = await axiosInstance.post<LiveKitTokenResponse>(GET_LIVEKIT_TOKEN(), {
    roomName,
  })
  return response.data
}

