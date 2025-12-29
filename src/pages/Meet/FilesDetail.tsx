import { ArrowLeft, Download, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetRecording, useMeetRecordingAnalysis } from '@/hooks/queries/meet.queries'
import { formatDistanceToNow } from 'date-fns'

interface FilesDetailProps {
  recordingId: string
  onBack: () => void
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
}

export function FilesDetail({ recordingId, onBack }: FilesDetailProps) {
  const { data: recording, isLoading: recordingLoading } = useMeetRecording(recordingId)
  const { data: analysis } = useMeetRecordingAnalysis(
    recording?.analysisStatus === 'completed' ? recordingId : null
  )

  if (recordingLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!recording) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive">Recording not found</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }

  const StatusIcon = statusConfig[recording.analysisStatus].icon
  const statusColor = statusConfig[recording.analysisStatus].color
  const statusBg = statusConfig[recording.analysisStatus].bg
  const statusLabel = statusConfig[recording.analysisStatus].label

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Files
      </Button>

      <div className="space-y-6">
        {/* Recording Info */}
        <div className="border border-border rounded-lg p-6 bg-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Meeting {recording.meetId}</h1>
              <p className="text-muted-foreground">
                Recorded {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBg} ${statusColor} flex items-center gap-2`}>
                <StatusIcon className={`h-4 w-4 ${recording.analysisStatus === 'processing' ? 'animate-spin' : ''}`} />
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(recording.duration)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">
                {new Date(recording.startTime).toLocaleString()}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open(recording.recordingUrl, '_blank')}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Recording
          </Button>
        </div>

        {/* Analysis */}
        {recording.analysisStatus === 'completed' && analysis && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-6">
            <h2 className="text-xl font-bold">Analysis</h2>

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
            </div>

            {/* Key Points */}
            {analysis.keyPoints && analysis.keyPoints.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Key Points</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {analysis.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {analysis.actionItems && analysis.actionItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Action Items</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {analysis.actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transcription */}
            <div>
              <h3 className="font-semibold mb-2">Transcription</h3>
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {analysis.transcription}
                </p>
              </div>
            </div>
          </div>
        )}

        {recording.analysisStatus === 'processing' && (
          <div className="border border-border rounded-lg p-6 bg-card text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Analysis in progress...</p>
          </div>
        )}

        {recording.analysisStatus === 'pending' && (
          <div className="border border-border rounded-lg p-6 bg-card text-center">
            <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Analysis pending</p>
          </div>
        )}

        {recording.analysisStatus === 'failed' && (
          <div className="border border-border rounded-lg p-6 bg-card text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Analysis failed</p>
          </div>
        )}
      </div>
    </div>
  )
}

