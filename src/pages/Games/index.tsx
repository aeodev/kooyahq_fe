import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, History, Grid3x3 } from 'lucide-react'
import { useGameTypesQuery, useGameMatchesQuery, useActiveUsersQuery, useGameQueryActions } from '@/hooks/queries/game.queries'
import { useGameInvitations } from '@/composables/game/useGameInvitations'
import { ActiveUsersSidebar } from './components/ActiveUsersSidebar'
import { LeaderboardView } from './components/LeaderboardView'
import { MatchHistoryView } from './components/MatchHistoryView'
import { GameInvitationModal } from '@/components/games/GameInvitationModal'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import { PERMISSIONS } from '@/constants/permissions'
import type { ActiveUser } from '@/types/game'

export function Games() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const can = useAuthStore((state) => state.can)
  const socket = useSocketStore((state) => state.socket)
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'games' | 'leaderboard' | 'history'>('games')

  const canPlayGames = useMemo(
    () => can(PERMISSIONS.GAME_PLAY) || can(PERMISSIONS.GAME_FULL_ACCESS),
    [can]
  )

  // Use TanStack Query for cached data fetching
  const { data: gameTypes = [] } = useGameTypesQuery()
  const { data: matches = [], isLoading: loading, refetch: refetchMatches } = useGameMatchesQuery()
  const { data: activeUsers = [] } = useActiveUsersQuery()
  const { setActiveUsers } = useGameQueryActions()
  const { invitation, sendInvitation, acceptInvitation, declineInvitation } = useGameInvitations({ activeUsers })

  // Listen for active users updates via socket
  useEffect(() => {
    if (!socket?.connected) return

    socket.on('game:active-users', (data: { users: ActiveUser[] }) => {
      setActiveUsers(data.users)
    })

    return () => {
      socket.off('game:active-users')
    }
  }, [socket, setActiveUsers])

  const handleInvite = (gameType: string, invitedUserId: string) => {
    sendInvitation(gameType, invitedUserId)
  }

  const handlePoke = (userId: string) => {
    if (!socket?.connected) {
      alert('Socket not connected. Please wait a moment.')
      return
    }

    socket.emit('user:poke', { pokedUserId: userId })
  }

  const handleStartGame = (gameType: string, opponentId?: string, isAI = false) => {
    if (isAI) {
      navigate(`/games/play/${gameType}?opponent=AI`)
    } else {
      navigate(`/games/play/${gameType}${opponentId ? `?opponent=${opponentId}` : ''}`)
    }
  }

  return (
    <div className="flex gap-0 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 min-w-0 max-w-full pr-0 md:pr-16">
        <header className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Games</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Play minigames with your team</p>
        </header>

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-3 md:inline-flex">
            <TabsTrigger value="games" className="flex-1 md:flex-initial">
              <Grid3x3 className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">All Games</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 md:flex-initial">
              <Trophy className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 md:flex-initial">
              <History className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Match History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
                {gameTypes.map((gameType) => (
                  <Card key={gameType.type} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{gameType.name}</CardTitle>
                      <CardDescription>{gameType.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {canPlayGames ? (
                        <Button
                          onClick={() => handleStartGame(gameType.type)}
                          className="w-full"
                          variant="default"
                        >
                          Play
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="default"
                          disabled
                          title="You don't have permission to play games"
                        >
                          Play
                        </Button>
                      )}
                      {canPlayGames && (gameType.type === 'tic-tac-toe' || gameType.type === 'rock-paper-scissors') && (
                        <Button
                          onClick={() => handleStartGame(gameType.type, undefined, true)}
                          className="w-full"
                          variant="secondary"
                        >
                          Play vs AI
                        </Button>
                      )}
                      <Button
                        onClick={() => setSelectedGameType(gameType.type)}
                        variant="outline"
                        className="w-full"
                      >
                        View Leaderboard
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardView
              gameTypes={gameTypes}
              selectedGameType={selectedGameType}
              onGameTypeSelect={setSelectedGameType}
            />
          </TabsContent>

          <TabsContent value="history">
            <MatchHistoryView matches={matches} loading={loading} onRefresh={() => refetchMatches()} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Active Users Sidebar */}
      <ActiveUsersSidebar
        activeUsers={activeUsers}
        onInvite={handleInvite}
        gameTypes={gameTypes}
        currentUserId={user?.id}
        onPoke={handlePoke}
      />

      {/* Game Invitation Modal */}
      {invitation && (
        <GameInvitationModal
          open={!!invitation}
          fromUserName={invitation.fromUserName}
          gameType={invitation.gameType}
          onAccept={acceptInvitation}
          onDecline={declineInvitation}
        />
      )}
    </div>
  )
}

