import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { TicTacToe } from './components/TicTacToe'
import { ReactionTimeTest } from './components/ReactionTimeTest'
import { RockPaperScissors } from './components/RockPaperScissors'
import { NumberGuessing } from './components/NumberGuessing'
import { TetrisBattle } from './components/TetrisBattle'
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
    <div className="flex h-full min-h-full w-full flex-col">
      {gameType === 'tic-tac-toe' && (
        <div className="flex-1 -m-4 md:-m-6">
          <TicTacToe onClose={handleClose} opponentId={opponentId} />
        </div>
      )}
      {gameType === 'reaction-test' && (
        <div className="flex-1 -m-4 md:-m-6">
          <ReactionTimeTest onClose={handleClose} opponentId={opponentId} />
        </div>
      )}
      {gameType === 'rock-paper-scissors' && <RockPaperScissors onClose={handleClose} opponentId={opponentId} />}
      {gameType === 'number-guessing' && <NumberGuessing onClose={handleClose} opponentId={opponentId} />}
      {gameType === 'tetris-battle' && <TetrisBattle onClose={handleClose} opponentId={opponentId} />}
      {!['tic-tac-toe', 'reaction-test', 'rock-paper-scissors', 'number-guessing', 'tetris-battle'].includes(gameType) && (
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
