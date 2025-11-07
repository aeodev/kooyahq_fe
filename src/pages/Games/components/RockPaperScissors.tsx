import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import {
  ROCK_PAPER_SCISSORS_CHOICES,
  ROCK_PAPER_SCISSORS_WIN_CONDITIONS,
  type RockPaperScissorsChoice,
} from '@/hooks/game-constants'
import { useGameMatch } from '@/hooks/useGameMatch'

type Choice = RockPaperScissorsChoice
type RoundResult = 'win' | 'loss' | 'draw' | null

interface RockPaperScissorsProps {
  onClose: () => void
  opponentId?: string
}

export function RockPaperScissors({ onClose, opponentId }: RockPaperScissorsProps) {
  const user = useAuthStore((state) => state.user)
  const [playerScore, setPlayerScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null)
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult>(null)
  const [gameFinished, setGameFinished] = useState(false)
  const isAI = opponentId === 'AI'

  const { match, loading, createMatch, completeMatch, abandonMatch, setMatch } = useGameMatch()

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (gameFinished && match && !isAI && opponentId) {
      completeMatchGame()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameFinished, match, isAI, opponentId])

  const initializeGame = async () => {
    if (!user) return

    if (isAI || !opponentId) {
      return
    }

    try {
      const gameMatch = await createMatch({
        gameType: 'rock-paper-scissors',
        players: [user.id, opponentId],
        status: 'in-progress',
        metadata: {
          rounds: [],
          playerScore: 0,
          opponentScore: 0,
        },
      })

      if (!gameMatch) {
        alert('Failed to start game')
      }
    } catch (error) {
      console.error('Failed to initialize game:', error)
      alert('Failed to start game')
    }
  }

  const completeMatchGame = async () => {
    if (!match || !user || isAI || !opponentId) return

    const winnerId = playerScore > opponentScore ? user.id : opponentId
    const scores: Record<string, number> = {}
    scores[user.id] = playerScore
    scores[opponentId] = opponentScore

    await completeMatch(match.id, winnerId, scores, {
      rounds,
      playerScore,
      opponentScore,
    })
  }

  const getAIChoice = (): Choice => {
    return ROCK_PAPER_SCISSORS_CHOICES[Math.floor(Math.random() * ROCK_PAPER_SCISSORS_CHOICES.length)]
  }

  const determineWinner = (player: Choice, opponent: Choice): RoundResult => {
    if (player === opponent) return 'draw'
    return ROCK_PAPER_SCISSORS_WIN_CONDITIONS[player] === opponent ? 'win' : 'loss'
  }

  const handleChoice = (choice: Choice) => {
    if (playerChoice || gameFinished || loading) return

    const opponent = isAI ? getAIChoice() : null // For multiplayer, opponent makes choice separately
    setPlayerChoice(choice)
    
    if (isAI && opponent) {
      setOpponentChoice(opponent)
      const result = determineWinner(choice, opponent)
      setRoundResult(result)
      
      const newRounds = [...rounds, result]
      setRounds(newRounds)
      
      let newPlayerScore = playerScore
      let newOpponentScore = opponentScore
      
      if (result === 'win') {
        newPlayerScore = playerScore + 1
        setPlayerScore(newPlayerScore)
      } else if (result === 'loss') {
        newOpponentScore = opponentScore + 1
        setOpponentScore(newOpponentScore)
      }

      // Check if game finished after updating scores
      if (newPlayerScore === 2 || newOpponentScore === 2) {
        setGameFinished(true)
      }

      setTimeout(() => {
        if (newPlayerScore < 2 && newOpponentScore < 2) {
          setCurrentRound(currentRound + 1)
          setPlayerChoice(null)
          setOpponentChoice(null)
          setRoundResult(null)
        }
      }, 2000)
    } else {
      // For multiplayer, wait for opponent
      setOpponentChoice(null)
      setRoundResult(null)
    }
  }

  const resetGame = () => {
    if (match && !isAI && !gameFinished) {
      abandonMatch(match.id)
    }

    setPlayerScore(0)
    setOpponentScore(0)
    setRounds([])
    setCurrentRound(1)
    setPlayerChoice(null)
    setOpponentChoice(null)
    setRoundResult(null)
    setGameFinished(false)
    setMatch(null)
    initializeGame()
  }

  const getResultMessage = () => {
    if (roundResult === 'win') return 'You win!'
    if (roundResult === 'loss') return isAI ? 'AI wins!' : 'Opponent wins!'
    if (roundResult === 'draw') return "It's a draw!"
    return null
  }

  const getChoiceEmoji = (choice: Choice) => {
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' }
    return emojis[choice]
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Rock Paper Scissors</CardTitle>
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
          <p className="text-sm text-muted-foreground">Best of 3 rounds</p>
          <div className="flex justify-center gap-6 text-2xl font-bold">
            <div>
              <p className="text-sm text-muted-foreground">You</p>
              <p className="text-primary">{playerScore}</p>
            </div>
            <div className="text-muted-foreground">-</div>
            <div>
              <p className="text-sm text-muted-foreground">{isAI ? 'AI' : 'Opponent'}</p>
              <p className="text-secondary">{opponentScore}</p>
            </div>
          </div>
          {!gameFinished && <p className="text-xs text-muted-foreground">Round {currentRound}</p>}
        </div>

        {gameFinished ? (
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-lg font-semibold">
              {playerScore > opponentScore
                ? 'You won the match!'
                : playerScore < opponentScore
                  ? isAI
                    ? 'AI won the match!'
                    : 'Opponent won the match!'
                  : "It's a tie!"}
            </p>
          </div>
        ) : roundResult !== null ? (
          <div className="text-center p-4 rounded-lg bg-muted">
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <p className="text-4xl mb-2">{getChoiceEmoji(playerChoice!)}</p>
                <p className="text-xs text-muted-foreground">You</p>
              </div>
              <div className="text-center">
                <p className="text-4xl mb-2">{getChoiceEmoji(opponentChoice!)}</p>
                <p className="text-xs text-muted-foreground">{isAI ? 'AI' : 'Opponent'}</p>
              </div>
            </div>
            <p className="text-lg font-semibold">{getResultMessage()}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Choose your move:</p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => handleChoice('rock')}
                disabled={!!playerChoice || loading}
                className="h-24 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-3xl mb-1">🪨</span>
                <span className="text-xs">Rock</span>
              </Button>
              <Button
                onClick={() => handleChoice('paper')}
                disabled={!!playerChoice || loading}
                className="h-24 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-3xl mb-1">📄</span>
                <span className="text-xs">Paper</span>
              </Button>
              <Button
                onClick={() => handleChoice('scissors')}
                disabled={!!playerChoice || loading}
                className="h-24 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-3xl mb-1">✂️</span>
                <span className="text-xs">Scissors</span>
              </Button>
            </div>
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

