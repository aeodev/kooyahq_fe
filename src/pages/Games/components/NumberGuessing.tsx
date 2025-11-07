import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RotateCcw } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_MATCH, UPDATE_MATCH } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { GameMatch } from '@/types/game'

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
  const [endTime, setEndTime] = useState<number>(0)
  const isAI = opponentId === 'AI'

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (gameFinished && match && !isAI) {
      completeMatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFinished, match])

  const initializeGame = async () => {
    if (!user) return

    // Don't create matches for AI or single player
    if (isAI || !opponentId) {
      setLoading(false)
      // Still allow playing
      const number = Math.floor(Math.random() * 100) + 1
      setTargetNumber(number)
      setStartTime(Date.now())
      return
    }

    try {
      setLoading(true)
      const players = [user.id, opponentId]
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

  const completeMatch = async () => {
    if (!match || !user || isAI) return

    try {
      const timeTaken = endTime - startTime
      const scores: Record<string, number> = {}
      scores[user.id] = timeTaken

      await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'completed',
        winner: user.id,
        scores,
        metadata: {
          targetNumber,
          guesses,
          timeTaken,
        },
        endedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to complete match:', error)
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
      setEndTime(Date.now())
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
    if (match && !isAI && !gameFinished) {
      abandonMatch()
    }

    setTargetNumber(null)
    setGuess('')
    setGuesses([])
    setMessage('')
    setGameFinished(false)
    setStartTime(0)
    setEndTime(0)
    setMatch(null)
    initializeGame()
  }

  const abandonMatch = async () => {
    if (!match || !user || isAI) return

    try {
      await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'abandoned',
        endedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to abandon match:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !gameFinished) {
      handleGuess()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Number Guessing</CardTitle>
            {isAI && (
              <span className="px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded">
                AI Mode
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your guess (1-100)"
                disabled={loading || !targetNumber}
                className="flex-1"
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

        <div className="flex gap-2">
          <Button onClick={resetGame} variant="outline" className="flex-1" disabled={loading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}





