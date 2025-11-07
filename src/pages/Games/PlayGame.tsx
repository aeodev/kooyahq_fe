import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { TicTacToe } from './components/TicTacToe'
import { ReactionTimeTest } from './components/ReactionTimeTest'
import { RockPaperScissors } from './components/RockPaperScissors'
import { NumberGuessing } from './components/NumberGuessing'
import type { GameType } from '@/types/game'

export function PlayGame() {
  const { gameType } = useParams<{ gameType: GameType }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const opponentId = searchParams.get('opponent') || undefined

  const handleClose = () => {
    navigate('/games')
  }

  if (!gameType) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Invalid game type</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
      {gameType === 'tic-tac-toe' && <TicTacToe onClose={handleClose} opponentId={opponentId} />}
      {gameType === 'reaction-test' && <ReactionTimeTest onClose={handleClose} opponentId={opponentId} />}
      {gameType === 'rock-paper-scissors' && <RockPaperScissors onClose={handleClose} opponentId={opponentId} />}
      {gameType === 'number-guessing' && <NumberGuessing onClose={handleClose} opponentId={opponentId} />}
      {!['tic-tac-toe', 'reaction-test', 'rock-paper-scissors', 'number-guessing'].includes(gameType) && (
        <div className="text-center">
          <p>Game not implemented yet</p>
          <button onClick={handleClose} className="mt-4 text-primary hover:underline">
            Back to games
          </button>
        </div>
      )}
    </div>
  )
}

