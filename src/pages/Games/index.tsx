import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, History } from 'lucide-react'
import { useGameTypes, useGameMatches, useActiveUsers } from '@/hooks/game.hooks'
import { useGameInvitations } from '@/hooks/useGameInvitations'
import { ActiveUsersSidebar } from './components/ActiveUsersSidebar'
import { LeaderboardView } from './components/LeaderboardView'
import { MatchHistoryView } from './components/MatchHistoryView'
import { GameInvitationModal } from '@/components/games/GameInvitationModal'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import type { ActiveUser } from '@/types/game'

export function Games() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'games' | 'leaderboard' | 'history'>('games')

  const { gameTypes, fetchGameTypes } = useGameTypes()
  const { matches, loading, fetchMatches } = useGameMatches()
  const { activeUsers, setActiveUsers, fetchActiveUsers } = useActiveUsers()
  const { invitation, sendInvitation, acceptInvitation, declineInvitation } = useGameInvitations({ activeUsers })

  useEffect(() => {
    fetchGameTypes()
    fetchMatches()
    fetchActiveUsers()

    // Listen for active users updates via socket
    if (socket?.connected) {
      socket.on('game:active-users', (data: { users: ActiveUser[] }) => {
        setActiveUsers(data.users)
      })

      return () => {
        socket.off('game:active-users')
      }
    }
  }, [socket, fetchGameTypes, fetchMatches, fetchActiveUsers, setActiveUsers])

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
    <div className="flex gap-0 h-[calc(100vh-8rem)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-20 md:pr-16">
        <header className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Games</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Play minigames with your team</p>
        </header>

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="games">All Games</TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Match History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {gameTypes.map((gameType) => (
                  <Card key={gameType.type} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{gameType.name}</CardTitle>
                      <CardDescription>{gameType.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => handleStartGame(gameType.type)}
                        className="w-full"
                        variant="default"
                      >
                        Play
                      </Button>
                      {(gameType.type === 'tic-tac-toe' || gameType.type === 'rock-paper-scissors') && (
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
            <MatchHistoryView matches={matches} loading={loading} onRefresh={fetchMatches} />
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

