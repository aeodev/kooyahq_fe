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
  'tetris-battle': 'Tetris Battle',
}

// =====================================
// TETRIS BATTLE CONSTANTS
// =====================================

// Grid dimensions
export const TETRIS_COLS = 10
export const TETRIS_ROWS = 20
export const TETRIS_HIDDEN_ROWS = 2 // Extra rows above visible grid for spawning

// Tetromino types
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

// Tetromino shapes (rotation states) - Standard Rotation System (SRS)
export const TETROMINOES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
}

// Tetromino colors
export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#6ba4c8', // Muted cyan
  O: '#cbb96b', // Muted yellow
  T: '#9c7fae', // Muted purple
  S: '#7fae8a', // Muted green
  Z: '#c07a7a', // Muted red
  J: '#6f7fae', // Muted blue
  L: '#c2936a', // Muted orange
}

// SRS wall kick data for J, L, S, T, Z pieces
export const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

// SRS wall kick data for I piece
export const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

// Attack table (lines sent based on action)
export const ATTACK_TABLE = {
  single: 0,
  double: 1,
  triple: 2,
  tetris: 4,
  tSpinMini: 0,
  tSpinSingle: 2,
  tSpinDouble: 4,
  tSpinTriple: 6,
  perfectClear: 10,
  // Combo bonuses (0-indexed: combo 1 = index 0)
  combo: [0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5],
}

// Hold queue size
export const HOLD_QUEUE_SIZE = 4

// Next queue size
export const NEXT_QUEUE_SIZE = 4

// Game timing
export const TETRIS_TICK_RATE = 50 // 20 Hz
export const LOCK_DELAY = 500 // 500ms lock delay
export const DAS_DELAY = 150 // Delayed Auto Shift initial delay
export const DAS_INTERVAL = 30 // DAS repeat interval
export const SOFT_DROP_INTERVAL = 50 // Soft drop speed

// Level-based gravity (frames per cell drop)
export const GRAVITY_LEVELS = [
  800, 720, 640, 560, 480, 400, 320, 240, 160, 80,
  70, 60, 50, 40, 30, 20, 10, 5, 3, 1,
]

// Block types
export type BlockType = TetrominoType | 'garbage' | 'bomb' | null

// Bomb color
export const BOMB_COLOR = '#cc4444'
export const GARBAGE_COLOR = '#5f5f5f'

// Create empty Tetris grid
export function createEmptyTetrisGrid(): BlockType[][] {
  return Array.from({ length: TETRIS_ROWS + TETRIS_HIDDEN_ROWS }, () =>
    Array(TETRIS_COLS).fill(null)
  )
}

// 7-bag randomizer
export function create7BagRandomizer(seed: number) {
  // Simple seeded random number generator (Mulberry32)
  let state = seed
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const bags: TetrominoType[][] = []
  const allPieces: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

  const shuffle = (arr: TetrominoType[]): TetrominoType[] => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const ensureBags = () => {
    while (bags.length < 2) {
      bags.push(shuffle(allPieces))
    }
  }

  const next = (): TetrominoType => {
    ensureBags()
    const piece = bags[0].shift()!
    if (bags[0].length === 0) {
      bags.shift()
      ensureBags()
    }
    return piece
  }

  const peek = (count: number): TetrominoType[] => {
    ensureBags()
    const result: TetrominoType[] = []
    let bagIdx = 0
    let pieceIdx = 0
    for (let i = 0; i < count; i++) {
      while (pieceIdx >= bags[bagIdx].length) {
        bagIdx++
        pieceIdx = 0
        if (bags.length <= bagIdx) {
          bags.push(shuffle(allPieces))
        }
      }
      result.push(bags[bagIdx][pieceIdx])
      pieceIdx++
    }
    return result
  }

  // Initialize
  ensureBags()

  return { next, peek }
}




