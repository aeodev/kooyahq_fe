import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RotateCcw } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_MATCH, UPDATE_MATCH } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { GameMatch } from '@/types/game'
import { GameLayout } from './GameLayout'

interface NumberGuessingProps {
  onClose: () => void
  opponentId?: string
}

export function NumberGuessing({ onClose, opponentId }: NumberGuessingProps) {
  const user = useAuthStore((state) => state.user)
  const [targetNumber, setTargetNumber] = useState<number | null>(null)
  const [guess, setGuess] = useState('')
  const [guesses, setGuesses] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [match, setMatch] = useState<GameMatch | null>(null)
  const [loading, setLoading] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const isAI = opponentId === 'AI'

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (gameFinished && match && match.status !== 'completed') {
      completeMatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFinished, match])

  const initializeGame = async () => {
    if (!user) return

    try {
      setLoading(true)
      const players = opponentId && !isAI ? [user.id, opponentId] : [user.id]
      const number = Math.floor(Math.random() * 100) + 1
      setTargetNumber(number)
      setStartTime(Date.now())

      const response = await axiosInstance.post(CREATE_MATCH(), {
        gameType: 'number-guessing',
        players,
        status: 'in-progress',
        metadata: {
          targetNumber: number,
          guesses: [],
          opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
        },
        startedAt: new Date().toISOString(),
      })
      setMatch(response.data.data)
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  const completeMatch = async (timeTakenOverride?: number) => {
    if (!match || !user) return

    try {
      const timeTaken = timeTakenOverride ?? Math.max(0, Date.now() - startTime)
      const scores: Record<string, number> = {}
      scores[user.id] = timeTaken

      const response = await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'completed',
        winner: user.id,
        scores,
        metadata: {
          targetNumber,
          guesses,
          timeTaken,
          opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
        },
        endedAt: new Date().toISOString(),
      })
      if (response.data?.data?.status === 'completed') {
        setMatch({ ...match, status: 'completed' })
      }
    } catch (error) {
      console.error('Failed to complete match:', error)
    }
  }

  const abandonMatch = async () => {
    if (!match || !user) return

    try {
      const timeTaken = startTime ? Math.max(0, Date.now() - startTime) : 0
      const response = await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'completed',
        scores: {},
        metadata: {
          targetNumber,
          guesses,
          timeTaken,
          opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
          outcome: 'abandoned',
        },
        endedAt: new Date().toISOString(),
      })
      if (response.data?.data?.status === 'completed') {
        setMatch({ ...match, status: 'completed' })
      }
    } catch (error) {
      console.error('Failed to abandon match:', error)
    }
  }

  const handleGuess = () => {
    if (!targetNumber || gameFinished || !guess) return

    const numGuess = parseInt(guess, 10)
    if (isNaN(numGuess) || numGuess < 1 || numGuess > 100) {
      setMessage('Please enter a number between 1 and 100')
      return
    }

    const newGuesses = [...guesses, numGuess]
    setGuesses(newGuesses)
    setGuess('')

    if (numGuess === targetNumber) {
      setGameFinished(true)
      const timeTaken = Date.now() - startTime
      setMessage(`Correct! You guessed it in ${guesses.length + 1} tries in ${Math.round(timeTaken / 1000)}s!`)
    } else if (numGuess < targetNumber) {
      setMessage('Too low! Try a higher number.')
    } else {
      setMessage('Too high! Try a lower number.')
    }
  }

  const resetGame = () => {
    if (match && match.status !== 'completed') {
      if (gameFinished) {
        completeMatch()
      } else {
        abandonMatch()
      }
    }

    setTargetNumber(null)
    setGuess('')
    setGuesses([])
    setMessage('')
    setGameFinished(false)
    setStartTime(0)
    setMatch(null)
    initializeGame()
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !gameFinished) {
      handleGuess()
    }
  }

  const handleClose = () => {
    if (match && match.status !== 'completed') {
      const finalize = gameFinished ? completeMatch() : abandonMatch()
      Promise.resolve(finalize).finally(() => {
        onClose()
      })
      return
    }
    onClose()
  }

  return (
    <GameLayout
      title="Number Guessing"
      badge={isAI ? <Badge variant="secondary">AI Mode</Badge> : null}
      onClose={handleClose}
    >
      <div className="w-full space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Guess the number between 1 and 100</p>
          {!gameFinished && targetNumber && (
            <p className="text-xs text-muted-foreground">Guesses: {guesses.length}</p>
          )}
        </div>

        {gameFinished ? (
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-lg font-semibold mb-2">{message}</p>
            <p className="text-sm text-muted-foreground">
              The number was {targetNumber}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 max-w-sm mx-auto w-full">
              <Input
                type="number"
                min="1"
                max="100"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your guess (1-100)"
                disabled={loading || !targetNumber}
                className="flex-1 min-w-0"
              />
              <Button onClick={handleGuess} disabled={loading || !targetNumber || !guess}>
                Guess
              </Button>
            </div>
            {message && (
              <div className={`text-center p-3 rounded-lg ${
                message.includes('Correct') ? 'bg-green-500/10 text-green-600' : 'bg-muted'
              }`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
            {guesses.length > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-2">Your guesses:</p>
                <div className="flex gap-2 flex-wrap">
                  {guesses.map((g, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-background rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={resetGame} variant="outline" className="w-full" disabled={loading}>
          <RotateCcw className="w-4 h-4 mr-2" />
          New Game
        </Button>
      </div>
    </GameLayout>
  )
}
