import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw } from 'lucide-react'
import axiosInstance from '@/utils/axios.instance'
import { CREATE_MATCH, UPDATE_MATCH } from '@/utils/api.routes'
import { useAuthStore } from '@/stores/auth.store'
import type { GameMatch } from '@/types/game'
import { GameLayout } from './GameLayout'

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

  // Complete any started match before closing
  const handleClose = () => {
    if (match && match.status !== 'completed' && reactionTimes.length > 0) {
      finalizeMatch().finally(() => {
        onClose()
      })
      return
    }
    onClose()
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
      // Complete match on unmount if it was started
      if (match && match.status !== 'completed' && reactionTimes.length > 0) {
        finalizeMatch()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeGame = () => {
    setGameState('waiting')
    setReactionTimes([])
    setCurrentReaction(null)
  }

  const ensureMatch = async (): Promise<GameMatch | null> => {
    if (!user) return null
    if (match) return match

    try {
      const players = opponentId && !isAI ? [user.id, opponentId] : [user.id]
      const response = await axiosInstance.post(CREATE_MATCH(), {
        gameType: 'reaction-test',
        players,
        status: 'in-progress',
        metadata: {
          rounds: [],
          opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
        },
        startedAt: new Date().toISOString(),
      })
      const createdMatch = response.data.data
      setMatch(createdMatch)
      return createdMatch
    } catch (error) {
      console.error('Failed to create match:', error)
      alert('Failed to start game')
      return null
    }
  }

  const completeMatch = async (
    finalReactionTimes: number[],
    avgTime: number,
    bestTime: number,
    matchOverride?: GameMatch | null
  ) => {
    const activeMatch = matchOverride ?? match
    if (!activeMatch || !user) return

    try {
      const response = await axiosInstance.patch(UPDATE_MATCH(activeMatch.id), {
        status: 'completed',
        winner: user.id,
        scores: {
          [user.id]: avgTime,
        },
        metadata: {
          reactionTimes: finalReactionTimes,
          averageTime: avgTime,
          bestTime,
          opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
        },
        endedAt: new Date().toISOString(),
      })

      // Verify the match was actually completed
      if (response.data?.data?.status === 'completed') {
        setMatch({ ...activeMatch, status: 'completed' })
        console.log('Match completed successfully')
      } else {
        console.error('Match update did not return completed status:', response.data)
        // Retry once
        setTimeout(() => {
          completeMatch(finalReactionTimes, avgTime, bestTime, activeMatch)
        }, 1000)
      }
    } catch (error: any) {
      console.error('Failed to complete match:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      console.error('Error details:', errorMessage)
      
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          const retryResponse = await axiosInstance.patch(UPDATE_MATCH(activeMatch.id), {
            status: 'completed',
            winner: user.id,
            scores: {
              [user.id]: avgTime,
            },
            metadata: {
              reactionTimes: finalReactionTimes,
              averageTime: avgTime,
              bestTime,
              opponentType: isAI ? 'ai' : opponentId ? 'user' : 'solo',
            },
            endedAt: new Date().toISOString(),
          })
          
          if (retryResponse.data?.data?.status === 'completed') {
            setMatch({ ...activeMatch, status: 'completed' })
            console.log('Match completed on retry')
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError)
        }
      }, 1000)
    }
  }

  const finalizeMatch = async () => {
    if (!match || match.status === 'completed') return
    if (reactionTimes.length === 0) return
    const avgTime = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    const bestTime = Math.min(...reactionTimes)
    await completeMatch(reactionTimes, avgTime, bestTime)
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

  const handleScreenClick = async () => {
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
      const activeMatch = await ensureMatch()
      const reactionTime = Date.now() - startTimeRef.current
      const newReactionTimes = [...reactionTimes, reactionTime]
      setCurrentReaction(reactionTime)
      setReactionTimes(newReactionTimes)

      if (newReactionTimes.length === 5) {
        // Round 5 completed - mark as finished immediately
        setGameState('finished')
        // Complete the match immediately when round 5 finishes
        if (activeMatch) {
          // Update match with final results
          const avgTime = Math.round(newReactionTimes.reduce((a, b) => a + b, 0) / newReactionTimes.length)
          const bestTime = Math.min(...newReactionTimes)
          
          // Complete match with proper async handling
          completeMatch(newReactionTimes, avgTime, bestTime, activeMatch)
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
    if (match && match.status !== 'completed' && reactionTimes.length > 0) {
      finalizeMatch()
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

  const roundLabel =
    reactionTimes.length > 0 && reactionTimes.length < 5 ? (
      <span className="text-sm text-muted-foreground">Round {reactionTimes.length}/5</span>
    ) : null

  return (
    <GameLayout
      title="Reaction Time Test"
      badge={isAI ? <Badge variant="secondary">AI Mode</Badge> : null}
      onClose={handleClose}
      headerRight={roundLabel}
      bodyClassName="flex-1 flex w-full flex-col p-0 min-h-0"
      contentClassName="flex-1 flex flex-col w-full max-w-none min-h-0"
    >
      <div
        className={`flex-1 w-full flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer ${getBackgroundColor()}`}
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

      {reactionTimes.length > 0 && gameState !== 'finished' && (
        <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-between w-full">
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

      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-center gap-2 w-full">
          <Button onClick={resetGame} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </GameLayout>
  )
}
