import { useCallback, useRef, useState } from 'react'
import { useMeetStore } from '@/stores/meet.store'
import axiosInstance from '@/utils/axios.instance'
import { UPLOAD_MEET_RECORDING } from '@/utils/api.routes'

export function useRecording(stream: MediaStream | null, meetId: string | null) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const recordedChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<Date | null>(null)

  const startRecording = useCallback(() => {
    if (!stream) return

    const chunks: Blob[] = []
    recordedChunksRef.current = chunks
    startTimeRef.current = new Date()

    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    })

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onstop = async () => {
      const endTime = new Date()
      const startTime = startTimeRef.current || endTime
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      const blob = new Blob(chunks, { type: 'video/webm' })
      
      // Upload to backend if meetId is available
      if (meetId) {
        setIsUploading(true)
        try {
          const formData = new FormData()
          formData.append('recording', blob, `meet-recording-${Date.now()}.webm`)
          formData.append('meetId', meetId)
          formData.append('duration', duration.toString())
          formData.append('startTime', startTime.toISOString())
          formData.append('endTime', endTime.toISOString())

          await axiosInstance.post(UPLOAD_MEET_RECORDING(), formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
        } catch (error) {
          console.error('Failed to upload recording:', error)
          // Fallback to download if upload fails
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `meet-recording-${Date.now()}.webm`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } finally {
          setIsUploading(false)
        }
      } else {
        // Fallback to download if no meetId
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meet-recording-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }

    recorder.start()
    setMediaRecorder(recorder)
    setIsRecording(true)
    useMeetStore.getState().setRecording(true)
  }, [stream, meetId])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setIsRecording(false)
      useMeetStore.getState().setRecording(false)
      setMediaRecorder(null)
    }
  }, [mediaRecorder])

  return {
    isRecording,
    isUploading,
    startRecording,
    stopRecording,
  }
}
