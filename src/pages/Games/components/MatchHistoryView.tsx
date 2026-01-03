import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, History } from 'lucide-react'
import type { GameMatch } from '@/types/game'

interface MatchHistoryViewProps {
  matches: GameMatch[]
  loading: boolean
  onRefresh: () => void
}

export function MatchHistoryView({ matches, loading, onRefresh }: MatchHistoryViewProps) {
  const completedCount = matches.filter((m) => m.status === 'completed').length
  const inProgressCount = matches.filter((m) => m.status === 'in-progress' || m.status === 'waiting').length
  const abandonedCount = matches.filter((m) => m.status === 'abandoned').length

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      completed: 'default',
      'in-progress': 'secondary',
      waiting: 'outline',
      abandoned: 'outline',
    }
    return variants[status] || 'outline'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Match History</h2>
          <p className="text-sm text-muted-foreground">
            {matches.length} total - {completedCount} completed
            {(inProgressCount > 0 || abandonedCount > 0) && (
              <span className="text-muted-foreground/70">
                {` - ${inProgressCount} in progress - ${abandonedCount} abandoned`}
              </span>
            )}
          </p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No match history yet</p>
            <p className="text-sm mt-2">Start playing games to see your history!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold capitalize">{match.gameType.replace('-', ' ')}</h3>
                      <Badge variant={getStatusBadge(match.status)}>{match.status}</Badge>
                    </div>
                    {match.gameType === 'reaction-test' ? (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Player: {match.playerNames[0] || 'Unknown'}</span>
                        </div>
                        {match.metadata?.averageTime && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Average: </span>
                            <span className="font-semibold">{Math.round(match.metadata.averageTime as number)}ms</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Players: {(match.playerNames?.length ? match.playerNames : match.players).join(', ')}</span>
                        </div>
                        {match.winner && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Winner: </span>
                            <span className="font-semibold">{match.winnerName || match.winner}</span>
                          </p>
                        )}
                        {match.scores && Object.keys(match.scores).length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Scores: </span>
                            {Object.entries(match.scores).map(([userId, score], idx) => {
                              const playerName = match.playerNames[match.players.indexOf(userId)] || userId
                              return (
                                <span key={userId}>
                                  {idx > 0 && ', '}
                                  <span className="font-semibold">{playerName}: {score}</span>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(match.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
