import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Circle, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { TIC_TAC_TOE_WINNING_LINES, TIC_TAC_TOE_BOARD_SIZE, createEmptyTicTacToeBoard } from '@/hooks/game-constants'
import { useGameMatch } from '@/composables/game/useGameMatch'
import { useMultiplayerGame } from '@/composables/game/useMultiplayerGame'
import { GameLayout } from './GameLayout'

type Player = 'X' | 'O' | null
type Board = Player[]

interface TicTacToeProps {
  onClose: () => void
  opponentId?: string
}

export function TicTacToe({ onClose, opponentId }: TicTacToeProps) {
  const user = useAuthStore((state) => state.user)
  const [board, setBoard] = useState<Board>(createEmptyTicTacToeBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')
  const [winner, setWinner] = useState<Player | 'draw' | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player>('X') // Which player am I (X or O)
  const isAI = opponentId === 'AI'
  const isMultiplayer = opponentId && opponentId !== 'AI' && user

  const {
    match,
    loading,
    findOrCreateMatch,
    createMatch,
    updateMatch,
    completeMatch,
    clearMatch,
    refreshCurrentMatch,
  } = useGameMatch()

  // Handle move updates from multiplayer socket
  const handleMoveReceived = useCallback(
    (data: { userId: string; gameId: string; move: { index?: number; player?: string | 'X' | 'O' | null } }) => {
      const { index, player } = data.move
      if (index === undefined || player === undefined || player === null) return

      const playerValue = player as Player
      setBoard((prevBoard) => {
        const newBoard = [...prevBoard]
        newBoard[index] = playerValue

        // Check for winner after opponent's move
        const gameWinner = checkWinner(newBoard)
        if (gameWinner) {
          setWinner(gameWinner)
        } else {
          setCurrentPlayer(playerValue === 'X' ? 'O' : 'X')
        }

        return newBoard
      })
    },
    []
  )

  const { sendMove } = useMultiplayerGame({
    gameId: match?.id,
    enabled: !!isMultiplayer,
    onMoveReceived: handleMoveReceived,
  })

  // Initialize game and match
  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update match result when winner is determined
  useEffect(() => {
    if (winner && match && match.status !== 'completed') {
      updateMatchResult()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, match])

  // Sync local state from match metadata whenever it changes (e.g., from poll or initial load)
  useEffect(() => {
    if (!match?.metadata) return

    const metadata = match.metadata as any

    if (metadata.board && winner === null) {  // Only sync board if no winner yet
      const newBoard = metadata.board as Board
      setBoard(newBoard)

      // Re-check for winner from synced board (only if no winner yet)
      const gameWinner = checkWinner(newBoard)
      if (gameWinner) {
        setWinner(gameWinner)
      }
    }

    if (metadata.currentPlayer && winner === null) {  // Only sync currentPlayer if no winner yet
      setCurrentPlayer(metadata.currentPlayer as Player)
    }
  }, [match?.metadata])

  // Poll for match updates every 3s during active multiplayer play (ensures sync if socket misses)
  useEffect(() => {
    if (!isMultiplayer || !match || winner !== null || loading) return

    const interval = setInterval(async () => {
      await refreshCurrentMatch()
    }, 3000)

    return () => clearInterval(interval)
  }, [isMultiplayer, match, winner, loading, refreshCurrentMatch])

  const initializeGame = async () => {
    if (!user || !isMultiplayer || !opponentId) return

    try {
      // Sort player IDs to ensure consistent match lookup
      const sortedPlayers = [user.id, opponentId].sort()

      // Find or create match
      const gameMatch = await findOrCreateMatch({
        gameType: 'tic-tac-toe',
        players: sortedPlayers,
        status: 'in-progress',
        metadata: {
          board: createEmptyTicTacToeBoard(),
          currentPlayer: 'X',
        },
      })

      if (!gameMatch) {
        alert('Failed to start game')
        return
      }

      // Determine which player I am (first in sorted array is X, second is O)
      const amFirst = sortedPlayers[0] === user.id
      setMyPlayer(amFirst ? 'X' : 'O')

      // Get current board state from match metadata if available
      if (gameMatch.metadata?.board) {
        setBoard(gameMatch.metadata.board as Board)
      }
      if (gameMatch.metadata?.currentPlayer) {
        setCurrentPlayer(gameMatch.metadata.currentPlayer as Player)
      } else {
        setCurrentPlayer('X')
      }
    } catch (error) {
      console.error('Failed to initialize game:', error)
      alert('Failed to start game')
    }
  }

  const ensureSoloMatch = async () => {
    if (!user || isMultiplayer || match) return

    await createMatch({
      gameType: 'tic-tac-toe',
      players: [user.id],
      status: 'in-progress',
      metadata: {
        board,
        currentPlayer,
        opponentType: isAI ? 'ai' : 'solo',
      },
    })
  }

  const updateMatchResult = async () => {
    if (!match || !user) return

    const isSoloMatch = match.players.length === 1
    const isAiMatch = isSoloMatch && isAI
    let winnerId: string | undefined
    const scores: Record<string, number> = {}

    if (winner === 'draw') {
      winnerId = undefined
    } else if (isAiMatch) {
      if (winner === 'X') {
        winnerId = user.id
        scores[user.id] = 1
      } else if (winner === 'O') {
        winnerId = 'AI'
        scores['AI'] = 1
      }
    } else if (isSoloMatch) {
      winnerId = user.id
      scores[user.id] = 1
    } else if (winner === 'X') {
      winnerId = match.players[0]
      scores[match.players[0]] = 1
    } else if (winner === 'O') {
      winnerId = match.players[1]
      if (match.players[1]) scores[match.players[1]] = 1
    }

    await completeMatch(match.id, winnerId, scores, {
      board,
      finalResult: winner,
    })
  }

  const finalizeMatch = async () => {
    if (!match || match.status === 'completed') return
    if (winner) {
      await updateMatchResult()
      return
    }
    await completeMatch(match.id, undefined, undefined, {
      board,
      finalResult: 'incomplete',
      currentPlayer,
    })
  }

  const checkWinner = (boardState: Board): Player | 'draw' | null => {
    for (const line of TIC_TAC_TOE_WINNING_LINES) {
      const [a, b, c] = line
      if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
        return boardState[a]
      }
    }

    if (boardState.every((cell) => cell !== null)) {
      return 'draw'
    }

    return null
  }

  const getBestMove = (boardState: Board, player: Player): number => {
    // Check if AI can win
    for (let i = 0; i < TIC_TAC_TOE_BOARD_SIZE; i++) {
      if (boardState[i] === null) {
        const testBoard = [...boardState]
        testBoard[i] = player
        if (checkWinner(testBoard) === player) {
          return i
        }
      }
    }

    // Check if need to block player from winning
    const opponent: Player = player === 'O' ? 'X' : 'O'
    for (let i = 0; i < TIC_TAC_TOE_BOARD_SIZE; i++) {
      if (boardState[i] === null) {
        const testBoard = [...boardState]
        testBoard[i] = opponent
        if (checkWinner(testBoard) === opponent) {
          return i
        }
      }
    }

    // Try center
    if (boardState[4] === null) {
      return 4
    }

    // Try corners
    const corners = [0, 2, 6, 8]
    const availableCorners = corners.filter((i) => boardState[i] === null)
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)]
    }

    // Try any available spot
    const available = boardState
      .map((cell, index) => (cell === null ? index : null))
      .filter((index) => index !== null) as number[]
    return available[Math.floor(Math.random() * available.length)]
  }

  const makeAIMove = (boardState: Board) => {
    const bestMove = getBestMove(boardState, 'O')
    const newBoard = [...boardState]
    newBoard[bestMove] = 'O'
    setBoard(newBoard)

    const gameWinner = checkWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    } else {
      setCurrentPlayer('X')
    }
  }

  const handleCellClick = async (index: number) => {
    if (board[index] || winner || loading) return

    // In multiplayer, only allow move if it's my turn
    if (isMultiplayer && currentPlayer !== myPlayer) return

    // In AI mode, only allow move if it's X's turn (player's turn)
    if (isAI && currentPlayer !== 'X') return

    await ensureSoloMatch()

    const newBoard = [...board]
    newBoard[index] = currentPlayer
    setBoard(newBoard)

    // Send move via socket for multiplayer
    if (isMultiplayer && match?.id) {
      sendMove({
        index,
        player: currentPlayer as string,
      })

      // Update match metadata with current board state
      const nextPlayer = currentPlayer === 'X' ? 'O' : 'X'
      await updateMatch(match.id, {
        metadata: {
          board: newBoard,
          currentPlayer: nextPlayer,
        },
      })
    }

    const gameWinner = checkWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    } else {
      if (isAI) {
        // AI's turn
        setCurrentPlayer('O')
        setTimeout(() => {
          makeAIMove(newBoard)
        }, 300)
      } else if (isMultiplayer) {
        // Switch turn in multiplayer
        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
      } else {
        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
      }
    }
  }

  const resetGame = () => {
    if (match && match.status !== 'completed') {
      void finalizeMatch()
    }
    setBoard(createEmptyTicTacToeBoard())
    setCurrentPlayer('X')
    setWinner(null)
    clearMatch()
    initializeGame()
  }

  const renderCell = (index: number) => {
    const value = board[index]
    return (
      <button
        key={index}
        onClick={() => handleCellClick(index)}
        disabled={!!value || !!winner || loading}
        className="aspect-square w-full flex items-center justify-center border-2 border-border rounded-xl bg-card hover:bg-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {value === 'X' && <X className="w-12 h-12 sm:w-14 sm:h-14 text-primary" strokeWidth={3} />}
        {value === 'O' && <Circle className="w-12 h-12 sm:w-14 sm:h-14 text-secondary" strokeWidth={3} />}
      </button>
    )
  }

  const handleClose = () => {
    if (match && match.status !== 'completed') {
      finalizeMatch().finally(() => {
        onClose()
      })
      return
    }
    onClose()
  }

  return (
    <GameLayout
      title="Tic Tac Toe"
      badge={isAI ? <Badge variant="secondary">AI Mode</Badge> : null}
      onClose={handleClose}
      bodyClassName="flex-1 flex w-full p-0"
      contentClassName="flex-1 w-full max-w-none"
    >
      <div className="flex-1 w-full flex flex-col gap-6 p-6">
        {winner && (
          <div className="text-center p-4 rounded-lg bg-muted">
            {winner === 'draw' ? (
              <p className="text-lg font-semibold">It's a draw!</p>
            ) : (
              <p className="text-lg font-semibold">
                {isAI && winner === 'X'
                  ? 'You win!'
                  : isAI && winner === 'O'
                    ? 'AI wins!'
                    : (() => {
                        // For multiplayer, show player name
                        if (match && match.players && match.playerNames) {
                          const winnerIndex = winner === 'X' ? 0 : 1
                          const winnerPlayerId = match.players[winnerIndex]
                          const winnerName = match.playerNames[winnerIndex] || `Player ${winner}`
                          
                          // If winner is current user, show "You win!"
                          if (user && winnerPlayerId === user.id) {
                            return 'You win!'
                          }
                          return `${winnerName} wins!`
                        }
                        return `Player ${winner} wins!`
                      })()}
              </p>
            )}
          </div>
        )}

        {!winner && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isAI
                ? currentPlayer === 'X'
                  ? 'Your turn'
                  : "AI's turn"
                : isMultiplayer
                  ? currentPlayer === myPlayer
                    ? 'Your turn'
                    : "Opponent's turn"
                  : 'Current player:'}
            </p>
            {!isMultiplayer && <p className="text-xl font-semibold">{currentPlayer}</p>}
            {isMultiplayer && (
              <p className="text-xl font-semibold">
                You are {myPlayer} · Current: {currentPlayer}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 w-full max-w-[clamp(260px,45vw,420px)] mx-auto">
          {Array.from({ length: TIC_TAC_TOE_BOARD_SIZE }).map((_, index) => renderCell(index))}
        </div>

        <Button onClick={resetGame} variant="outline" className="w-full max-w-sm mx-auto">
          <RotateCcw className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>
    </GameLayout>
  )
}
