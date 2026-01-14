export type GameType = 'tic-tac-toe' | 'rock-paper-scissors' | 'number-guessing' | 'reaction-test' | 'tetris-battle'

export type GameStatus = 'in-progress' | 'completed'

export interface GameMatch {
  id: string
  gameType: GameType
  players: string[]
  playerNames: string[]
  status: GameStatus
  winner?: string
  winnerName?: string
  scores?: Record<string, number>
  metadata?: Record<string, unknown>
  startedAt?: string
  endedAt?: string
  createdAt: string
  updatedAt: string
}

export interface GameLeaderboardEntry {
  userId: string
  userName: string
  userEmail: string
  wins: number
  losses: number
  draws: number
  totalGames: number
  winRate: number
  bestScore?: number
  avgScore?: number
}

export interface GameTypeInfo {
  type: GameType
  name: string
  description: string
}

export interface ActiveUser {
  id: string
  name: string
  email: string
  profilePic?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
}
