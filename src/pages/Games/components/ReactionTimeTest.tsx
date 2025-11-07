import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, X } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_MATCH, UPDATE_MATCH } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { GameMatch } from '@/types/game'

interface ReactionTimeTestProps {
  onClose: () => void
  opponentId?: string
}

type GameState = 'waiting' | 'ready' | 'go' | 'too-early' | 'finished'

export function ReactionTimeTest({ onClose, opponentId }: ReactionTimeTestProps) {
  const user = useAuthStore((state) => state.user)
  const [gameState, setGameState] = useState<GameState>('waiting')
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [currentReaction, setCurrentReaction] = useState<number | null>(null)
  const [match, setMatch] = useState<GameMatch | null>(null)
  const startTimeRef = useRef<number>(0)
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const minDelayRef = useRef<number>(2000)
  const maxDelayRef = useRef<number>(5000)
  const isAI = opponentId === 'AI'

  // Complete or abandon match when closing
  const handleClose = () => {
    if (match && !isAI) {
      if (gameState === 'finished' && reactionTimes.length === 5) {
        // Already completed by the round 5 handler, just close
        onClose()
      } else {
        // Abandon if not finished
        abandonMatch().finally(() => {
          onClose()
        })
      }
    } else {
      onClose()
    }
  }

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current)
      }
      // Abandon match on unmount if not completed
      if (match && !isAI && reactionTimes.length < 5) {
        abandonMatch()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeGame = async () => {
    if (!user) return

    // Don't create matches for AI games
    // Reaction test can be played solo and should record scores
    if (isAI) {
      return
    }

    try {
      const players = opponentId ? [user.id, opponentId] : [user.id]
      const response = await axiosInstance.post(CREATE_MATCH(), {
        gameType: 'reaction-test',
        players,
        status: 'in-progress',
        metadata: {
          rounds: [],
        },
        startedAt: new Date().toISOString(),
      })
      setMatch(response.data.data)
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to start game')
    }
  }

  const completeMatch = async (finalReactionTimes: number[], avgTime: number, bestTime: number) => {
    if (!match || !user || isAI) return

    try {
      const response = await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'completed',
        winner: user.id,
        scores: {
          [user.id]: avgTime,
        },
        metadata: {
          reactionTimes: finalReactionTimes,
          averageTime: avgTime,
          bestTime,
        },
        endedAt: new Date().toISOString(),
      })

      // Verify the match was actually completed
      if (response.data?.data?.status === 'completed') {
        setMatch({ ...match, status: 'completed' })
        console.log('Match completed successfully')
      } else {
        console.error('Match update did not return completed status:', response.data)
        // Retry once
        setTimeout(() => {
          completeMatch(finalReactionTimes, avgTime, bestTime)
        }, 1000)
      }
    } catch (error: any) {
      console.error('Failed to complete match:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      console.error('Error details:', errorMessage)
      
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          const retryResponse = await axiosInstance.patch(UPDATE_MATCH(match.id), {
            status: 'completed',
            winner: user.id,
            scores: {
              [user.id]: avgTime,
            },
            metadata: {
              reactionTimes: finalReactionTimes,
              averageTime: avgTime,
              bestTime,
            },
            endedAt: new Date().toISOString(),
          })
          
          if (retryResponse.data?.data?.status === 'completed') {
            setMatch({ ...match, status: 'completed' })
            console.log('Match completed on retry')
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError)
        }
      }, 1000)
    }
  }

  const abandonMatch = async () => {
    // Don't abandon AI games
    if (isAI || !match || !user) return

    try {
      await axiosInstance.patch(UPDATE_MATCH(match.id), {
        status: 'abandoned',
        endedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to abandon match:', error)
    }
  }

  const startRound = () => {
    setGameState('ready')
    setCurrentReaction(null)

    // Random delay between min and max
    const delay = Math.random() * (maxDelayRef.current - minDelayRef.current) + minDelayRef.current

    countdownTimeoutRef.current = setTimeout(() => {
      setGameState('go')
      startTimeRef.current = Date.now()
    }, delay)
  }

  const handleScreenClick = () => {
    if (gameState === 'waiting' || gameState === 'finished') {
      startRound()
      return
    }

    if (gameState === 'ready') {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current)
        countdownTimeoutRef.current = undefined
      }
      setGameState('too-early')
      setTimeout(() => {
        setGameState('waiting')
      }, 1000)
      return
    }

    if (gameState === 'go') {
      const reactionTime = Date.now() - startTimeRef.current
      const newReactionTimes = [...reactionTimes, reactionTime]
      setCurrentReaction(reactionTime)
      setReactionTimes(newReactionTimes)

      if (newReactionTimes.length === 5) {
        // Round 5 completed - mark as finished immediately
        setGameState('finished')
        // Complete the match immediately when round 5 finishes
        if (match && !isAI) {
          // Update match with final results
          const avgTime = Math.round(newReactionTimes.reduce((a, b) => a + b, 0) / newReactionTimes.length)
          const bestTime = Math.min(...newReactionTimes)
          
          // Complete match with proper async handling
          completeMatch(newReactionTimes, avgTime, bestTime)
        }
      } else {
        // Allow immediate clicking - no delay, user can click right away to continue
        setGameState('waiting')
      }
      return
    }

    if (gameState === 'too-early') {
      setGameState('waiting')
    }
  }

  const resetGame = () => {
    // Abandon current match if not completed
    if (match && !isAI && reactionTimes.length < 5) {
      abandonMatch()
    }
    
    setReactionTimes([])
    setCurrentReaction(null)
    setGameState('waiting')
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current)
      countdownTimeoutRef.current = undefined
    }
    setMatch(null)
    initializeGame()
  }

  const getAverageTime = () => {
    if (reactionTimes.length === 0) return 0
    return Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
  }

  const getBestTime = () => {
    if (reactionTimes.length === 0) return 0
    return Math.min(...reactionTimes)
  }

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'go':
        return 'bg-green-500'
      case 'too-early':
        return 'bg-red-500'
      case 'ready':
        return 'bg-yellow-500'
      default:
        return 'bg-muted'
    }
  }

  const getScreenText = () => {
    switch (gameState) {
      case 'waiting':
        return reactionTimes.length === 0 ? 'Click anywhere to start' : 'Click to continue'
      case 'ready':
        return 'Wait for green...'
      case 'go':
        return 'CLICK!'
      case 'too-early':
        return 'Too Early!'
      case 'finished':
        return 'Test Complete!'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Reaction Time Test</h1>
          {isAI && (
            <span className="px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded">
              AI Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {reactionTimes.length > 0 && reactionTimes.length < 5 && (
            <div className="text-sm text-muted-foreground mr-2">
              Round {reactionTimes.length}/5
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Full screen clickable area */}
      <div
        className={`flex-1 flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer ${getBackgroundColor()}`}
        onClick={handleScreenClick}
      >
        {gameState === 'waiting' && (
          <div className="text-center text-foreground">
            <p className="text-4xl font-bold mb-4">{getScreenText()}</p>
            {reactionTimes.length > 0 && reactionTimes.length < 5 && (
              <p className="text-lg text-muted-foreground">
                Round {reactionTimes.length + 1} of 5
              </p>
            )}
          </div>
        )}

        {gameState === 'ready' && (
          <div className="text-center text-foreground">
            <p className="text-3xl font-bold">{getScreenText()}</p>
          </div>
        )}

        {gameState === 'go' && (
          <div className="text-center text-white">
            <p className="text-6xl font-bold mb-4">{getScreenText()}</p>
          </div>
        )}

        {gameState === 'too-early' && (
          <div className="text-center text-white">
            <p className="text-4xl font-bold mb-2">{getScreenText()}</p>
            <p className="text-xl">Wait for green</p>
          </div>
        )}

        {currentReaction !== null && gameState === 'waiting' && reactionTimes.length < 5 && (
          <div className="text-center text-foreground mt-8">
            <p className="text-5xl font-bold">{currentReaction}ms</p>
            <p className="text-lg text-muted-foreground mt-4">Click to continue</p>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center text-foreground">
            <p className="text-4xl font-bold mb-4">{getScreenText()}</p>
            <div className="space-y-2 mt-6">
              <p className="text-2xl">
                Average: <span className="font-bold">{getAverageTime()}ms</span>
              </p>
              <p className="text-2xl">
                Best: <span className="font-bold text-primary">{getBestTime()}ms</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      {reactionTimes.length > 0 && gameState !== 'finished' && (
        <div className="p-4 bg-card border-t border-border">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-muted-foreground">Average: </span>
                <span className="font-semibold">{getAverageTime()}ms</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Best: </span>
                <span className="font-semibold text-primary">{getBestTime()}ms</span>
              </div>
            </div>
            <div className="flex gap-2">
              {reactionTimes.map((time, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-background rounded border border-border"
                >
                  {time}ms
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
          <Button onClick={resetGame} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
