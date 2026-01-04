import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trophy } from 'lucide-react'
import { useLeaderboard } from '@/hooks/game.hooks'
import type { GameTypeInfo } from '@/types/game'

interface LeaderboardViewProps {
  gameTypes: GameTypeInfo[]
  selectedGameType: string | null
  onGameTypeSelect: (gameType: string | null) => void
}

export function LeaderboardView({
  gameTypes,
  selectedGameType,
  onGameTypeSelect,
}: LeaderboardViewProps) {
  const [currentGameType, setCurrentGameType] = useState<string | null>(
    selectedGameType || gameTypes[0]?.type || null
  )
  const { leaderboard, loading, fetchLeaderboard } = useLeaderboard()

  useEffect(() => {
    if (currentGameType) {
      fetchLeaderboard(currentGameType, 100)
    }
  }, [currentGameType, fetchLeaderboard])

  useEffect(() => {
    if (!currentGameType && gameTypes.length > 0) {
      setCurrentGameType(gameTypes[0].type)
    }
  }, [currentGameType, gameTypes])

  useEffect(() => {
    if (selectedGameType) {
      setCurrentGameType(selectedGameType)
      onGameTypeSelect(null)
    }
  }, [selectedGameType, onGameTypeSelect])

  const currentGame = gameTypes.find((gt) => gt.type === currentGameType)
  const scoreUnit = currentGameType === 'reaction-test'
    ? ' ms'
    : currentGameType === 'tetris-battle'
      ? ' pts'
      : ''
  const bestLabel = currentGameType === 'tetris-battle' ? 'High Score' : 'Best'
  const avgLabel = currentGameType === 'tetris-battle' ? 'Avg Score' : 'Average'
  const formatScore = (value: number) => {
    if (currentGameType === 'tetris-battle') {
      return value.toLocaleString()
    }
    return Math.round(value).toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Game:</span>
        {gameTypes.map((gameType) => (
          <Button
            key={gameType.type}
            variant={currentGameType === gameType.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentGameType(gameType.type)}
          >
            {gameType.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leaderboard data yet for {currentGame?.name}</p>
            <p className="text-sm mt-2">Play some games to see rankings!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trophy className="h-5 w-5 inline mr-2" />
              Leaderboard - {currentGame?.name}
            </CardTitle>
            <CardDescription>
              {currentGameType === 'reaction-test'
                ? 'Top players ranked by best reaction time'
                : currentGameType === 'tetris-battle'
                  ? 'Top players ranked by high score'
                  : 'Top players ranked by wins'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    index === 0
                      ? 'bg-primary/5 border-primary/50'
                      : 'bg-card/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{entry.userName}</p>
                      {index === 0 && <Badge variant="default">#1</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.userEmail}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Wins:</span>
                        <span className="ml-2 font-semibold text-green-600">{entry.wins}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Losses:</span>
                        <span className="ml-2 font-semibold text-red-600">{entry.losses}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="ml-2 font-semibold">{entry.winRate}%</span>
                      </div>
                    </div>
                    {(entry.bestScore !== undefined || entry.avgScore !== undefined) && (
                      <div className="flex items-center gap-4 text-sm">
                        {entry.bestScore !== undefined && (
                          <div>
                            <span className="text-muted-foreground">{bestLabel}:</span>
                            <span className="ml-2 font-semibold text-primary">
                              {formatScore(entry.bestScore)}{scoreUnit}
                            </span>
                          </div>
                        )}
                        {entry.avgScore !== undefined && (
                          <div>
                            <span className="text-muted-foreground">{avgLabel}:</span>
                            <span className="ml-2 font-semibold">
                              {formatScore(entry.avgScore)}{scoreUnit}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {entry.totalGames} total games
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
