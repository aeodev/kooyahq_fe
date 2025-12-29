import { Clock, FileVideo, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { MeetRecording } from '@/hooks/queries/meet.queries'

interface FilesListProps {
  recordings: MeetRecording[]
  onSelectRecording: (id: string) => void
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
}

export function FilesList({ recordings, onSelectRecording }: FilesListProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <FileVideo className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No recordings yet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Start recording during a meeting to see your recordings and analysis here.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meet Files</h1>
        <p className="text-muted-foreground">View your meeting recordings and analysis</p>
      </div>

      <div className="space-y-3">
        {recordings.map((recording) => {
          const StatusIcon = statusConfig[recording.analysisStatus].icon
          const statusColor = statusConfig[recording.analysisStatus].color
          const statusBg = statusConfig[recording.analysisStatus].bg
          const statusLabel = statusConfig[recording.analysisStatus].label

          return (
            <button
              key={recording.id}
              onClick={() => onSelectRecording(recording.id)}
              className="w-full p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileVideo className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">Meeting {recording.meetId}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusBg} ${statusColor} flex items-center gap-1`}>
                      <StatusIcon className={`h-3 w-3 ${recording.analysisStatus === 'processing' ? 'animate-spin' : ''}`} />
                      {statusLabel}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(recording.duration)}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

