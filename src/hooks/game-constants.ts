// TicTacToe Constants
export const TIC_TAC_TOE_BOARD_SIZE = 9
export const TIC_TAC_TOE_WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6], // Diagonal top-right to bottom-left
] as const

export function createEmptyTicTacToeBoard(): Array<'X' | 'O' | null> {
  return Array(TIC_TAC_TOE_BOARD_SIZE).fill(null) as Array<'X' | 'O' | null>
}

// RockPaperScissors Constants
export type RockPaperScissorsChoice = 'rock' | 'paper' | 'scissors'
export const ROCK_PAPER_SCISSORS_CHOICES: RockPaperScissorsChoice[] = ['rock', 'paper', 'scissors']

export const ROCK_PAPER_SCISSORS_WIN_CONDITIONS: Record<RockPaperScissorsChoice, RockPaperScissorsChoice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
}

// Game Type Display Names
export const GAME_DISPLAY_NAMES: Record<string, string> = {
  'tic-tac-toe': 'Tic Tac Toe',
  'rock-paper-scissors': 'Rock Paper Scissors',
  'reaction-test': 'Reaction Time Test',
  'number-guessing': 'Number Guessing',
}





