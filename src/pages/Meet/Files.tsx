import { useState } from 'react'
import { useMeetRecordings } from '@/hooks/queries/meet.queries'
import { FilesList } from './FilesList'
import { FilesDetail } from './FilesDetail'
import { Loader2 } from 'lucide-react'

export function MeetFiles() {
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)
  const { data: recordings, isLoading, error } = useMeetRecordings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive">Failed to load recordings</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as Error).message || 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  if (selectedRecordingId) {
    return (
      <FilesDetail
        recordingId={selectedRecordingId}
        onBack={() => setSelectedRecordingId(null)}
      />
    )
  }

  return (
    <FilesList
      recordings={recordings || []}
      onSelectRecording={setSelectedRecordingId}
    />
  )
}

