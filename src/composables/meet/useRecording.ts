import { useCallback, useRef, useState } from 'react'
import { useMeetStore } from '@/stores/meet.store'

interface UseRecordingOptions {
  localStreamRef: React.RefObject<MediaStream | null>
}

export function useRecording({ localStreamRef }: UseRecordingOptions) {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const recordedChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(() => {
    if (!localStreamRef.current) return

    const chunks: Blob[] = []
    recordedChunksRef.current = chunks

    const recorder = new MediaRecorder(localStreamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus',
    })

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meet-recording-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    recorder.start()
    setMediaRecorder(recorder)
    setIsRecording(true)
    useMeetStore.getState().setRecording(true)
  }, [localStreamRef])

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
    startRecording,
    stopRecording,
  }
}




