import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RotateCcw, 
  Pause, 
  Play,
  Users,
  Trophy,
  Clock,
  Maximize,
  Minimize,
  ArrowLeft,
  Wifi,
  WifiOff,
  HelpCircle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'
import { useGameMatch } from '@/composables/game/useGameMatch'
import {
  TETRIS_COLS,
  TETRIS_ROWS,
  TETRIS_HIDDEN_ROWS,
  TETROMINOES,
  TETROMINO_COLORS,
  WALL_KICKS_JLSTZ,
  WALL_KICKS_I,
  ATTACK_TABLE,
  NEXT_QUEUE_SIZE,
  LOCK_DELAY,
  DAS_DELAY,
  DAS_INTERVAL,
  SOFT_DROP_INTERVAL,
  GRAVITY_LEVELS,
  createEmptyTetrisGrid,
  create7BagRandomizer,
  type TetrominoType,
  type BlockType,
} from '@/hooks/game-constants'

// =====================================
// TYPES
// =====================================

type GameView = 'menu' | 'lobby' | 'game'
type LobbyStatus = 'waiting' | 'countdown' | 'in-progress' | 'finished'
type DisplayBlockType = BlockType | 'ghost'

interface Position {
  x: number
  y: number
}

interface Piece {
  type: TetrominoType
  rotation: number
  position: Position
}

interface Player {
  odactuserId: string
  name: string
  ready?: boolean
  alive: boolean
  score: number
  koCount: number
  stackHeight?: number
}

interface GarbageLine {
  lines: number
  fromUserId: string
  timestamp: number
}

interface TetrisBattleProps {
  onClose: () => void
  opponentId?: string
}

// Animation keyframes as CSS string
const ANIMATION_STYLES = `
@keyframes lineClear {
  0% { opacity: 1; transform: scaleX(1); filter: brightness(1); }
  20% { opacity: 1; transform: scaleX(1.02); filter: brightness(2) saturate(1.5); background: white !important; }
  40% { opacity: 0.8; transform: scaleX(0.98); filter: brightness(1.5); }
  60% { opacity: 1; transform: scaleX(1.02); filter: brightness(2); background: white !important; }
  80% { opacity: 0.5; transform: scaleX(0.95); filter: brightness(1); }
  100% { opacity: 0; transform: scaleX(0) scaleY(0); }
}

@keyframes blockLock {
  0% { transform: scale(1.15); filter: brightness(1.5); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); filter: brightness(1); }
}

@keyframes blockSpawn {
  0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
  50% { opacity: 1; transform: scale(1.1) rotate(5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes blockShine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes bombPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 5px #ff0000, 0 0 10px #ff0000; }
  50% { transform: scale(1.05); box-shadow: 0 0 15px #ff0000, 0 0 25px #ff6600, 0 0 35px #ff0000; }
}

@keyframes ghostPulse {
  0%, 100% { opacity: 0.5; transform: scale(0.95); }
  50% { opacity: 0.9; transform: scale(1); }
}

@keyframes garbageShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-1px); }
  75% { transform: translateX(1px); }
}

@keyframes scorePopup {
  0% { transform: scale(0.5) translateY(0); opacity: 1; }
  100% { transform: scale(1.2) translateY(-20px); opacity: 0; }
}

@keyframes comboGlow {
  0%, 100% { text-shadow: 0 0 5px currentColor; }
  50% { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
}

@keyframes gridPulse {
  0%, 100% { box-shadow: inset 0 0 20px rgba(var(--primary-rgb), 0.1); }
  50% { box-shadow: inset 0 0 40px rgba(var(--primary-rgb), 0.2); }
}

@keyframes explosionBurst {
  0% { 
    transform: scale(0.3); 
    opacity: 1;
    filter: brightness(3) blur(0px);
  }
  30% {
    transform: scale(1.5);
    opacity: 1;
    filter: brightness(2) blur(1px);
  }
  100% { 
    transform: scale(3); 
    opacity: 0;
    filter: brightness(1) blur(4px);
  }
}

@keyframes explosionRing {
  0% { 
    transform: scale(0.5); 
    opacity: 1;
    border-width: 4px;
  }
  100% { 
    transform: scale(4); 
    opacity: 0;
    border-width: 1px;
  }
}

@keyframes explosionParticle {
  0% { 
    transform: translate(0, 0) scale(1); 
    opacity: 1;
  }
  100% { 
    transform: translate(var(--tx), var(--ty)) scale(0); 
    opacity: 0;
  }
}

@keyframes explosionFlash {
  0% { opacity: 0.8; }
  100% { opacity: 0; }
}

@keyframes bombExplosion {
  0% { 
    transform: scale(1) rotate(0deg); 
    filter: brightness(1);
  }
  20% { 
    transform: scale(1.5) rotate(10deg); 
    filter: brightness(3) saturate(2);
  }
  40% { 
    transform: scale(0.8) rotate(-5deg); 
    filter: brightness(2);
  }
  60% { 
    transform: scale(2) rotate(5deg); 
    filter: brightness(4) saturate(3);
  }
  100% { 
    transform: scale(3) rotate(0deg); 
    opacity: 0;
    filter: brightness(1) blur(10px);
  }
}

@keyframes shockwave {
  0% { 
    transform: scale(0.5);
    opacity: 0.8;
    border-width: 8px;
  }
  50% {
    opacity: 0.5;
  }
  100% { 
    transform: scale(6);
    opacity: 0;
    border-width: 1px;
  }
}

@keyframes smokeRise {
  0% { 
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  100% { 
    transform: translate(var(--tx), calc(var(--ty) - 40px)) scale(2);
    opacity: 0;
  }
}

@keyframes sparkle {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.3;
    transform: scale(0.5);
  }
}

@keyframes lineFlash {
  0% {
    opacity: 1;
    transform: scaleX(0);
  }
  20% {
    transform: scaleX(1.2);
  }
  100% {
    opacity: 0;
    transform: scaleX(1);
  }
}

@keyframes lineOverlay {
  0% { opacity: 0; transform: scaleX(0.6); }
  40% { opacity: 0.9; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(1); }
}

@keyframes bombOverlay {
  0% { opacity: 0.9; transform: scale(0.6); }
  100% { opacity: 0; transform: scale(1.4); }
}

@keyframes debrisFall {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) rotate(var(--rot));
    opacity: 0;
  }
}

.animate-line-clear { animation: lineClear 0.5s ease-out forwards; }
.animate-block-lock { animation: blockLock 0.2s ease-out; }
.animate-block-spawn { animation: blockSpawn 0.15s ease-out; }
.animate-bomb-pulse { animation: bombPulse 0.8s ease-in-out infinite; }
.animate-ghost-pulse { animation: ghostPulse 1s ease-in-out infinite; }
.animate-garbage-shake { animation: garbageShake 0.1s ease-in-out infinite; }
.animate-combo-glow { animation: comboGlow 0.5s ease-in-out infinite; }
.animate-grid-pulse { animation: gridPulse 2s ease-in-out infinite; }

.block-3d {
  position: relative;
  border-radius: 2px;
  transition: background-color 0.1s ease;
}

.block-3d::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 50%;
  bottom: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%);
  border-radius: 2px 0 0 0;
}

.block-3d::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  right: 0;
  bottom: 0;
  background: linear-gradient(315deg, rgba(0,0,0,0.3) 0%, transparent 50%);
  border-radius: 0 0 2px 0;
}

.block-shine {
  background-size: 200% 100%;
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.2) 50%,
    transparent 100%
  );
  animation: blockShine 3s linear infinite;
}

.block-glow {
  box-shadow: 
    inset 2px 2px 4px rgba(255,255,255,0.3),
    inset -2px -2px 4px rgba(0,0,0,0.3),
    0 0 8px var(--block-color, transparent);
}

.explosion-container {
  position: absolute;
  pointer-events: none;
  z-index: 100;
}

.explosion-burst {
  position: absolute;
  border-radius: 50%;
  animation: explosionBurst 0.6s ease-out forwards;
}

.explosion-ring {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  border-color: inherit;
  animation: explosionRing 0.8s ease-out forwards;
}

.explosion-particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: explosionParticle 0.5s ease-out forwards;
}

.explosion-flash {
  position: fixed;
  inset: 0;
  pointer-events: none;
  animation: explosionFlash 0.3s ease-out forwards;
  z-index: 50;
}

.bomb-explosion {
  animation: bombExplosion 0.6s ease-out forwards;
}

.shockwave {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  animation: shockwave 0.6s ease-out forwards;
}

.smoke-particle {
  position: absolute;
  border-radius: 50%;
  animation: smokeRise 0.8s ease-out forwards;
}

.sparkle {
  position: absolute;
  animation: sparkle 0.3s ease-in-out infinite;
}

.line-flash {
  position: absolute;
  height: 100%;
  animation: lineFlash 0.4s ease-out forwards;
  transform-origin: center;
}

.line-clear-overlay {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.35);
  animation: lineOverlay 0.2s ease-out forwards;
  transform-origin: center;
}

.bomb-clear-overlay {
  position: absolute;
  background: radial-gradient(circle, rgba(255, 220, 160, 0.9) 0%, rgba(255, 120, 80, 0.6) 50%, transparent 100%);
  border-radius: 50%;
  animation: bombOverlay 0.25s ease-out forwards;
}

.debris {
  position: absolute;
  animation: debrisFall 0.6s ease-out forwards;
}
`

// =====================================
// UTILITY FUNCTIONS
// =====================================

function getPieceShape(type: TetrominoType, rotation: number): number[][] {
  return TETROMINOES[type][rotation % 4]
}

function getWallKicks(type: TetrominoType, fromRotation: number, toRotation: number): [number, number][] {
  const key = `${fromRotation}->${toRotation}`
  return type === 'I' ? WALL_KICKS_I[key] || [] : WALL_KICKS_JLSTZ[key] || []
}

// =====================================
// MAIN COMPONENT
// =====================================

export function TetrisBattle({ onClose }: TetrisBattleProps) {
  const user = useAuthStore((state) => state.user)
  const socket = useSocketStore((state) => state.socket)
  const { match: tetrisMatch, createMatch, completeMatch, clearMatch } = useGameMatch()
  
  // View state
  const [gameView, setGameView] = useState<GameView>('menu')
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Lobby state
  const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('waiting')
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([])
  const [isReady, setIsReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [, setSeed] = useState<number>(Date.now())
  
  // Game state
  const [grid, setGrid] = useState<BlockType[][]>(createEmptyTetrisGrid())
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [ghostPosition, setGhostPosition] = useState<Position | null>(null)
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [nextPieces, setNextPieces] = useState<TetrominoType[]>([])
  const [score, setScore] = useState(0)
  const [linesCleared, setLinesCleared] = useState(0)
  const [level, setLevel] = useState(1)
  const [koCount, setKoCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameTime, setGameTime] = useState(180)
  
  // Multiplayer state
  const [opponents, setOpponents] = useState<Player[]>([])
  const [garbageBuffer, setGarbageBuffer] = useState<GarbageLine[]>([])
  
  // Animation state
  const [lastLockedCells, setLastLockedCells] = useState<{x: number, y: number}[]>([])
  const [clearOverlays, setClearOverlays] = useState<number[]>([])
  const [bombOverlays, setBombOverlays] = useState<{ x: number; y: number }[]>([])
  
  // Stats
  const [stats, setStats] = useState({
    linesPerMinute: 0,
    piecesPlaced: 0,
    tetrises: 0,
  })
  
  // Refs
  const randomizer = useRef<ReturnType<typeof create7BagRandomizer> | null>(null)
  const lastDropTime = useRef(0)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameLoopRef = useRef<number | null>(null)
  const keysPressed = useRef<Set<string>>(new Set())
  const softDropActive = useRef(false)
  const dasTimeouts = useRef<{ left: ReturnType<typeof setTimeout> | null; right: ReturnType<typeof setTimeout> | null }>({
    left: null,
    right: null,
  })
  const dasIntervals = useRef<{ left: ReturnType<typeof setInterval> | null; right: ReturnType<typeof setInterval> | null }>({
    left: null,
    right: null,
  })
  const lastAttackFrom = useRef<string | null>(null)
  const startTime = useRef<number>(0)

  // =====================================
  // FULLSCREEN TOGGLE
  // =====================================

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // =====================================
  // GAME LOGIC
  // =====================================

  const isValidPosition = useCallback((piece: Piece, gridState: BlockType[][]): boolean => {
    const shape = getPieceShape(piece.type, piece.rotation)
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const gridX = piece.position.x + x
          const gridY = piece.position.y + y
          if (gridX < 0 || gridX >= TETRIS_COLS) return false
          if (gridY >= TETRIS_ROWS + TETRIS_HIDDEN_ROWS) return false
          if (gridY >= 0 && gridState[gridY][gridX] !== null) return false
        }
      }
    }
    return true
  }, [])

  const calculateGhostPosition = useCallback((piece: Piece, gridState: BlockType[][]): Position => {
    let ghostY = piece.position.y
    while (isValidPosition({ ...piece, position: { x: piece.position.x, y: ghostY + 1 } }, gridState)) {
      ghostY++
    }
    return { x: piece.position.x, y: ghostY }
  }, [isValidPosition])

  const getStackHeight = useCallback((gridState: BlockType[][]): number => {
    for (let y = TETRIS_HIDDEN_ROWS; y < gridState.length; y++) {
      if (gridState[y].some(cell => cell !== null)) {
        return gridState.length - y
      }
    }
    return 0
  }, [])

  const emitPlayerUpdate = useCallback((gridState: BlockType[][], nextScore: number, nextKoCount: number, alive: boolean) => {
    if (!isMultiplayer || !socket?.connected) return
    socket.emit('tetris:player-update', {
      score: nextScore,
      stackHeight: getStackHeight(gridState),
      koCount: nextKoCount,
      alive,
    })
  }, [getStackHeight, isMultiplayer, socket])

  const spawnNextPiece = useCallback((currentGrid?: BlockType[][]) => {
    if (!randomizer.current) return
    
    const type = randomizer.current.next()
    const newNextPieces = randomizer.current.peek(NEXT_QUEUE_SIZE)
    setNextPieces(newNextPieces)
    
    const piece: Piece = {
      type,
      rotation: 0,
      position: { x: Math.floor(TETRIS_COLS / 2) - 1, y: 0 },
    }
    
    const gridToCheck = currentGrid || grid
    if (!isValidPosition(piece, gridToCheck)) {
      setIsGameOver(true)
      if (isMultiplayer && socket?.connected) {
        socket.emit('tetris:top-out')
      }
      return
    }
    
    setCurrentPiece(piece)
    setGhostPosition(calculateGhostPosition(piece, gridToCheck))
    lastDropTime.current = Date.now()
  }, [grid, isValidPosition, calculateGhostPosition, isMultiplayer, socket])

  const lockPiece = useCallback((pieceToLock?: Piece) => {
    const piece = pieceToLock || currentPiece
    if (!piece) return
    if (lockTimer.current) {
      clearTimeout(lockTimer.current)
      lockTimer.current = null
    }

    let newGrid = grid.map(row => [...row])
    const shape = getPieceShape(piece.type, piece.rotation)
    
    // Track locked cells for animation
    const lockedCells: {x: number, y: number}[] = []
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const gridY = piece.position.y + y
          const gridX = piece.position.x + x
          if (gridY >= 0 && gridY < TETRIS_ROWS + TETRIS_HIDDEN_ROWS) {
            newGrid[gridY][gridX] = piece.type
            lockedCells.push({ x: gridX, y: gridY - TETRIS_HIDDEN_ROWS })
          }
        }
      }
    }
    
    // Trigger lock animation
    setLastLockedCells(lockedCells)
    setTimeout(() => setLastLockedCells([]), 150)

    const clearedLines: number[] = []
    let bombExplosions = 0
    const bombPositions: { x: number; y: number }[] = []

    const findFullRows = () => {
      const fullRows: number[] = []
      for (let y = TETRIS_ROWS + TETRIS_HIDDEN_ROWS - 1; y >= TETRIS_HIDDEN_ROWS; y--) {
        if (newGrid[y].every(cell => cell != null)) {
          fullRows.push(y)
        }
      }
      return fullRows
    }

    let fullRows = findFullRows()
    while (fullRows.length > 0) {
      for (const rowY of fullRows) {
        const visibleY = rowY - TETRIS_HIDDEN_ROWS
        clearedLines.push(visibleY)
        for (let x = 0; x < TETRIS_COLS; x++) {
          if (newGrid[rowY][x] === 'bomb') {
            bombExplosions++
            bombPositions.push({ x, y: visibleY })
          }
        }
      }

      for (const rowY of [...fullRows].sort((a, b) => b - a)) {
        newGrid.splice(rowY, 1)
        newGrid.unshift(Array(TETRIS_COLS).fill(null))
      }

      fullRows = findFullRows()
    }

    if (clearedLines.length > 0) {
      setClearOverlays(clearedLines)
      setBombOverlays(bombPositions)
      setTimeout(() => {
        setClearOverlays([])
        setBombOverlays([])
      }, 200)
    }

    let attack = 0
    if (clearedLines.length === 1) attack = ATTACK_TABLE.single
    else if (clearedLines.length === 2) attack = ATTACK_TABLE.double
    else if (clearedLines.length === 3) attack = ATTACK_TABLE.triple
    else if (clearedLines.length === 4) attack = ATTACK_TABLE.tetris

    if (clearedLines.length > 0 && combo > 0) {
      attack += ATTACK_TABLE.combo[Math.min(combo, ATTACK_TABLE.combo.length - 1)]
    }
    attack += bombExplosions * 2

    let nextGarbageBuffer = garbageBuffer
    if (attack > 0 && garbageBuffer.length > 0) {
      const newGarbageBuffer = [...garbageBuffer]
      while (attack > 0 && newGarbageBuffer.length > 0) {
        if (newGarbageBuffer[0].lines <= attack) {
          attack -= newGarbageBuffer[0].lines
          newGarbageBuffer.shift()
        } else {
          newGarbageBuffer[0].lines -= attack
          attack = 0
        }
      }
      nextGarbageBuffer = newGarbageBuffer
      setGarbageBuffer(newGarbageBuffer)
    }

    if (attack > 0 && isMultiplayer && socket?.connected) {
      socket.emit('tetris:attack', { lines: attack })
    }

    setLinesCleared(prev => {
      const newLines = prev + clearedLines.length
      // Increase level every 10 lines
      setLevel(Math.min(Math.floor(newLines / 10) + 1, 20))
      return newLines
    })
    setCombo(clearedLines.length > 0 ? combo + 1 : 0)
    const scoreDelta = (clearedLines.length * 100 * level) + (bombExplosions * 200)
    const nextScore = score + scoreDelta
    setScore(prev => prev + scoreDelta)
    setStats(prev => ({
      ...prev,
      piecesPlaced: prev.piecesPlaced + 1,
      tetrises: prev.tetrises + (clearedLines.length === 4 ? 1 : 0),
    }))

    if (clearedLines.length === 0 && nextGarbageBuffer.length > 0) {
      const totalGarbage = nextGarbageBuffer.reduce((sum, g) => sum + g.lines, 0)
      const gridWithGarbage = newGrid.map(row => [...row])
      for (let i = 0; i < totalGarbage; i++) {
        gridWithGarbage.shift()
        const garbageLine: BlockType[] = Array(TETRIS_COLS).fill('garbage')
        garbageLine[Math.floor(Math.random() * TETRIS_COLS)] = 'bomb'
        gridWithGarbage.push(garbageLine)
      }
      newGrid.splice(0, newGrid.length, ...gridWithGarbage)
      setGarbageBuffer([])
    }

    setGrid(newGrid)

    if (piece.position.y < TETRIS_HIDDEN_ROWS) {
      setIsGameOver(true)
      if (isMultiplayer && socket?.connected) {
        socket.emit('tetris:top-out', { killedBy: lastAttackFrom.current })
      }
      emitPlayerUpdate(newGrid, nextScore, koCount, false)
      return
    }

    emitPlayerUpdate(newGrid, nextScore, koCount, true)

    spawnNextPiece(newGrid)
    setCanHold(true)
  }, [currentPiece, grid, combo, level, garbageBuffer, isMultiplayer, socket, spawnNextPiece, emitPlayerUpdate, koCount, score])

  const movePiece = useCallback((dx: number, dy: number): boolean => {
    if (!currentPiece || isPaused || isGameOver) return false
    
    const newPiece = {
      ...currentPiece,
      position: { x: currentPiece.position.x + dx, y: currentPiece.position.y + dy },
    }
    
    if (isValidPosition(newPiece, grid)) {
      setCurrentPiece(newPiece)
      setGhostPosition(calculateGhostPosition(newPiece, grid))
      if (lockTimer.current) {
        clearTimeout(lockTimer.current)
        lockTimer.current = null
      }
      return true
    }
    return false
  }, [currentPiece, isPaused, isGameOver, grid, isValidPosition, calculateGhostPosition])

  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (!currentPiece || isPaused || isGameOver) return
    
    const fromRotation = currentPiece.rotation
    const toRotation = (currentPiece.rotation + direction + 4) % 4
    const kicks = getWallKicks(currentPiece.type, fromRotation, toRotation)
    
    for (const [kickX, kickY] of kicks) {
      const newPiece: Piece = {
        ...currentPiece,
        rotation: toRotation,
        position: { x: currentPiece.position.x + kickX, y: currentPiece.position.y - kickY },
      }
      
      if (isValidPosition(newPiece, grid)) {
        setCurrentPiece(newPiece)
        setGhostPosition(calculateGhostPosition(newPiece, grid))
        if (lockTimer.current) {
          clearTimeout(lockTimer.current)
          lockTimer.current = null
        }
        return
      }
    }
  }, [currentPiece, isPaused, isGameOver, grid, isValidPosition, calculateGhostPosition])

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || isGameOver || !ghostPosition) return
    
    const dropDistance = ghostPosition.y - currentPiece.position.y
    setScore(prev => prev + dropDistance * 2)
    
    // Create the dropped piece at ghost position and lock it immediately
    const droppedPiece: Piece = { ...currentPiece, position: ghostPosition }
    setCurrentPiece(droppedPiece)
    lockPiece(droppedPiece)
  }, [currentPiece, isPaused, isGameOver, ghostPosition, lockPiece])

  const holdPiece = useCallback(() => {
    if (!currentPiece || !canHold || isPaused || isGameOver) return
    
    const currentType = currentPiece.type
    
    if (heldPiece) {
      // Swap: held piece comes out, current goes in
      const piece: Piece = {
        type: heldPiece,
        rotation: 0,
        position: { x: Math.floor(TETRIS_COLS / 2) - 1, y: 0 },
      }
      setHeldPiece(currentType)
      setCurrentPiece(piece)
      setGhostPosition(calculateGhostPosition(piece, grid))
    } else {
      // First hold: store current, spawn next
      setHeldPiece(currentType)
      spawnNextPiece()
    }
    
    setCanHold(false)
  }, [currentPiece, canHold, isPaused, isGameOver, heldPiece, grid, calculateGhostPosition, spawnNextPiece])

  // Game loop
  const gameLoop = useCallback(() => {
    if (isPaused || isGameOver || !currentPiece) return
    
    const now = Date.now()
    const baseInterval = GRAVITY_LEVELS[Math.min(level - 1, GRAVITY_LEVELS.length - 1)]
    const dropInterval = softDropActive.current ? SOFT_DROP_INTERVAL : baseInterval
    
    if (now - lastDropTime.current >= dropInterval) {
      const moved = movePiece(0, 1)
      lastDropTime.current = now
      
      if (!moved && !lockTimer.current) {
        lockTimer.current = setTimeout(() => {
          lockPiece()
          lockTimer.current = null
        }, LOCK_DELAY)
      }
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [isPaused, isGameOver, currentPiece, level, movePiece, lockPiece])

  // Keyboard controls
  useEffect(() => {
    if (gameView !== 'game' || isPaused || isGameOver) return
    
    const clearDas = (direction: 'left' | 'right') => {
      if (dasTimeouts.current[direction]) {
        clearTimeout(dasTimeouts.current[direction])
        dasTimeouts.current[direction] = null
      }
      if (dasIntervals.current[direction]) {
        clearInterval(dasIntervals.current[direction])
        dasIntervals.current[direction] = null
      }
    }

    const startDas = (direction: 'left' | 'right', code: string) => {
      const dx = direction === 'left' ? -1 : 1
      clearDas(direction)
      movePiece(dx, 0)
      dasTimeouts.current[direction] = setTimeout(() => {
        if (!keysPressed.current.has(code)) return
        dasIntervals.current[direction] = setInterval(() => {
          if (!keysPressed.current.has(code)) {
            clearDas(direction)
            return
          }
          movePiece(dx, 0)
        }, DAS_INTERVAL)
      }, DAS_DELAY)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (keysPressed.current.has(e.code)) return
      keysPressed.current.add(e.code)
      
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          startDas('left', e.code)
          break
        case 'ArrowRight':
        case 'KeyD':
          startDas('right', e.code)
          break
        case 'ArrowDown':
        case 'KeyS':
          softDropActive.current = true
          movePiece(0, 1)
          break
        case 'ArrowUp':
        case 'KeyX':
          rotatePiece(1)
          break
        case 'KeyZ':
        case 'ControlLeft':
          rotatePiece(-1)
          break
        case 'Space':
          e.preventDefault()
          hardDrop()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          holdPiece()
          break
        case 'Escape':
          if (showHelp) {
            setShowHelp(false)
          } else {
            setIsPaused(p => !p)
          }
          break
        case 'KeyF':
          toggleFullscreen()
          break
        case 'KeyH':
        case 'F1':
          e.preventDefault()
          setShowHelp(h => !h)
          break
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code)
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        clearDas('left')
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        clearDas('right')
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        softDropActive.current = false
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keysPressed.current.clear()
      softDropActive.current = false
      clearDas('left')
      clearDas('right')
    }
  }, [gameView, isPaused, isGameOver, showHelp, movePiece, rotatePiece, hardDrop, holdPiece, toggleFullscreen])

  // Start game loop
  useEffect(() => {
    if (gameView === 'game' && !isPaused && !isGameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameView, isPaused, isGameOver, gameLoop])

  // Game timer & progressive speed
  useEffect(() => {
    if (gameView === 'game' && !isPaused && !isGameOver) {
      const timer = setInterval(() => {
        setGameTime(prev => {
          if (prev <= 1) {
            setIsGameOver(true)
            return 0
          }
          
          // Increase level every 30 seconds (time-based speed increase)
          const elapsedSeconds = 180 - prev
          const timeBasedLevel = Math.floor(elapsedSeconds / 30) + 1
          setLevel(currentLevel => Math.max(currentLevel, Math.min(timeBasedLevel, 20)))
          
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameView, isPaused, isGameOver])

  // Stats update
  useEffect(() => {
    if (startTime.current > 0) {
      const elapsed = (Date.now() - startTime.current) / 60000
      if (elapsed > 0) {
        setStats(prev => ({ ...prev, linesPerMinute: Math.round(linesCleared / elapsed * 10) / 10 }))
      }
    }
  }, [linesCleared])

  // Socket handlers
  useEffect(() => {
    if (!socket?.connected) return
    
    socket.on('tetris:lobby-state', (data: { status: LobbyStatus; players: { odactuserId: string; name: string; ready: boolean }[]; seed: number }) => {
      setLobbyStatus(data.status)
      if (data.status !== 'countdown') setCountdown(null)
      setLobbyPlayers(data.players.map(player => ({
        ...player,
        alive: true,
        score: 0,
        koCount: 0,
      })))
      setSeed(data.seed)
    })
    
    socket.on('tetris:player-joined', (data: { odactuserId: string; name: string }) => {
      // Prevent duplicate entries (can happen when joining and receiving broadcast)
      setLobbyPlayers(prev => {
        if (prev.some(p => p.odactuserId === data.odactuserId)) return prev
        return [...prev, { odactuserId: data.odactuserId, name: data.name, ready: false, alive: true, score: 0, koCount: 0 }]
      })
    })
    
    socket.on('tetris:player-left', (data: { odactuserId: string }) => {
      setLobbyPlayers(prev => prev.filter(p => p.odactuserId !== data.odactuserId))
    })
    
    socket.on('tetris:player-ready', (data: { odactuserId: string; ready: boolean }) => {
      setLobbyPlayers(prev => prev.map(p => p.odactuserId === data.odactuserId ? { ...p, ready: data.ready } : p))
    })
    
    socket.on('tetris:countdown-start', (data: { duration: number }) => {
      setLobbyStatus('countdown')
      setCountdown(Math.ceil(data.duration / 1000))
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) { clearInterval(interval); return null }
          return prev - 1
        })
      }, 1000)
    })
    
    socket.on('tetris:game-start', (data: { seed: number; duration: number; players: { odactuserId: string; name: string }[] }) => {
      setGameView('game')
      setLobbyStatus('in-progress')
      setSeed(data.seed)
      setGameTime(Math.ceil(data.duration / 1000))
      setOpponents(
        data.players
          .filter(p => p.odactuserId !== user?.id)
          .map(player => ({ ...player, alive: true, score: 0, koCount: 0 }))
      )
      startGame(data.seed)
    })
    
    socket.on('tetris:receive-attack', (data: { fromUserId: string; lines: number; timestamp: number }) => {
      if (data.fromUserId === user?.id) return
      lastAttackFrom.current = data.fromUserId
      setGarbageBuffer(prev => [...prev, { lines: data.lines, fromUserId: data.fromUserId, timestamp: data.timestamp }])
    })

    socket.on('tetris:player-update', (data: { odactuserId: string; score: number; stackHeight: number; koCount: number; alive: boolean }) => {
      if (data.odactuserId === user?.id) {
        setKoCount(data.koCount)
        return
      }
      setOpponents(prev => prev.map(p => p.odactuserId === data.odactuserId ? {
        ...p,
        score: data.score,
        stackHeight: data.stackHeight,
        koCount: data.koCount,
        alive: data.alive,
      } : p))
    })
    
    socket.on('tetris:player-died', (data: { odactuserId: string; finalScore: number }) => {
      setOpponents(prev => prev.map(p => p.odactuserId === data.odactuserId ? { ...p, alive: false, score: data.finalScore } : p))
    })

    socket.on('tetris:player-disconnected', (data: { odactuserId: string }) => {
      setOpponents(prev => prev.map(p => p.odactuserId === data.odactuserId ? { ...p, alive: false } : p))
    })
    
    socket.on('tetris:game-end', () => {
      setLobbyStatus('finished')
      setIsGameOver(true)
    })
    
    socket.on('tetris:lobby-reset', () => {
      setLobbyStatus('waiting')
      setIsReady(false)
      resetGame()
      setGameView('lobby')
    })
    
    return () => {
      socket.off('tetris:lobby-state')
      socket.off('tetris:player-joined')
      socket.off('tetris:player-left')
      socket.off('tetris:player-ready')
      socket.off('tetris:countdown-start')
      socket.off('tetris:game-start')
      socket.off('tetris:receive-attack')
      socket.off('tetris:player-update')
      socket.off('tetris:player-died')
      socket.off('tetris:player-disconnected')
      socket.off('tetris:game-end')
      socket.off('tetris:lobby-reset')
    }
  }, [socket, user?.id])

  // =====================================
  // GAME ACTIONS
  // =====================================

  const startMatch = useCallback(async () => {
    if (!user?.id) return
    await createMatch({
      gameType: 'tetris-battle',
      players: [user.id],
      status: 'in-progress',
      metadata: {
        mode: isMultiplayer ? 'multiplayer' : 'solo',
      },
    })
  }, [createMatch, isMultiplayer, user?.id])

  const finalizeMatch = useCallback(async () => {
    if (!tetrisMatch || tetrisMatch.status === 'completed' || !user?.id) return
    const durationMs = startTime.current ? Date.now() - startTime.current : undefined
    await completeMatch(
      tetrisMatch.id,
      isMultiplayer ? undefined : user.id,
      { [user.id]: score },
      {
        score,
        linesCleared,
        level,
        koCount,
        stats,
        mode: isMultiplayer ? 'multiplayer' : 'solo',
        durationMs,
      },
    )
  }, [completeMatch, isMultiplayer, koCount, level, linesCleared, score, stats, tetrisMatch, user?.id])

  const startGame = useCallback((gameSeed: number) => {
    void startMatch()
    randomizer.current = create7BagRandomizer(gameSeed)
    lastAttackFrom.current = null
    softDropActive.current = false
    setClearOverlays([])
    setBombOverlays([])
    setGrid(createEmptyTetrisGrid())
    setHeldPiece(null)
    setCanHold(true)
    setScore(0)
    setLinesCleared(0)
    setLevel(1)
    setKoCount(0)
    setCombo(0)
    setIsPaused(false)
    setIsGameOver(false)
    setGarbageBuffer([])
    setStats({ linesPerMinute: 0, piecesPlaced: 0, tetrises: 0 })
    startTime.current = Date.now()
    spawnNextPiece(createEmptyTetrisGrid())
  }, [spawnNextPiece, startMatch])

  const resetGame = () => {
    if (tetrisMatch && tetrisMatch.status !== 'completed') {
      void finalizeMatch()
    }
    lastAttackFrom.current = null
    softDropActive.current = false
    setClearOverlays([])
    setBombOverlays([])
    setGrid(createEmptyTetrisGrid())
    setCurrentPiece(null)
    setGhostPosition(null)
    setHeldPiece(null)
    setCanHold(true)
    setNextPieces([])
    setScore(0)
    setLinesCleared(0)
    setLevel(1)
    setKoCount(0)
    setCombo(0)
    setIsPaused(false)
    setIsGameOver(false)
    setGameTime(180)
    setGarbageBuffer([])
    clearMatch()
  }

  useEffect(() => {
    if (!isGameOver) return
    void finalizeMatch()
  }, [isGameOver, finalizeMatch])

  const handleStartSinglePlayer = () => {
    setIsMultiplayer(false)
    setGameView('game')
    startGame(Date.now())
  }

  const handleJoinMultiplayer = () => {
    if (!socket?.connected || !user) return
    setIsMultiplayer(true)
    setGameView('lobby')
    socket.emit('tetris:join-lobby', { playerName: user.name })
  }

  const handleToggleReady = () => {
    if (!socket?.connected) return
    setIsReady(!isReady)
    socket.emit('tetris:ready', { ready: !isReady })
  }

  const handleLeaveLobby = () => {
    if (socket?.connected) socket.emit('tetris:leave-lobby')
    setGameView('menu')
    resetGame()
  }

  const handleClose = () => {
    if (tetrisMatch && tetrisMatch.status !== 'completed') {
      finalizeMatch().finally(() => {
        onClose()
      })
      return
    }
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // =====================================
  // RENDER HELPERS
  // =====================================

  const renderPiecePreview = (type: TetrominoType | null, isNext = false) => {
    if (!type) return <div className="w-12 h-12" />
    const shape = getPieceShape(type, 0)
    const color = TETROMINO_COLORS[type]
    return (
      <div className="flex justify-center items-center">
        <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}>
          {shape.map((row, y) => row.map((cell, x) => (
            <div 
              key={`${x}-${y}`} 
              className={`w-3 h-3 rounded-[1px] transition-all ${cell ? 'block-3d' : 'opacity-0'}`} 
              style={cell ? { 
                backgroundColor: color,
                boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.25)',
                opacity: isNext ? 1 : 0.9,
              } : {}} 
            />
          )))}
        </div>
      </div>
    )
  }

  const renderGrid = () => {
    const displayGrid: DisplayBlockType[][] = grid.map(row => [...row])
    
    // Ghost piece
    if (currentPiece && ghostPosition) {
      const shape = getPieceShape(currentPiece.type, currentPiece.rotation)
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const gridY = ghostPosition.y + y
            const gridX = ghostPosition.x + x
            if (gridY >= TETRIS_HIDDEN_ROWS && gridY < TETRIS_ROWS + TETRIS_HIDDEN_ROWS && !displayGrid[gridY][gridX]) {
              displayGrid[gridY][gridX] = 'ghost'
            }
          }
        }
      }
    }
    
    // Current piece
    if (currentPiece) {
      const shape = getPieceShape(currentPiece.type, currentPiece.rotation)
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const gridY = currentPiece.position.y + y
            const gridX = currentPiece.position.x + x
            if (gridY >= 0 && gridY < TETRIS_ROWS + TETRIS_HIDDEN_ROWS) {
              displayGrid[gridY][gridX] = currentPiece.type
            }
          }
        }
      }
    }

    const rowHeight = 100 / TETRIS_ROWS
    const colWidth = 100 / TETRIS_COLS

    return (
      <>
        {/* Inject animation styles */}
        <style>{ANIMATION_STYLES}</style>
        
        <div className="relative border-2 border-primary/30 bg-gradient-to-b from-background/80 to-muted/50 p-0.5 rounded-lg shadow-lg"
          style={{ 
            boxShadow: `
              0 0 20px rgba(var(--primary-rgb, 100, 100, 255), 0.1),
              inset 0 0 30px rgba(0, 0, 0, 0.2)
            `
          }}
        >
          <div className="relative">
            <div className="grid gap-[1px] bg-border/20 p-[1px] rounded" style={{ gridTemplateColumns: `repeat(${TETRIS_COLS}, 1fr)` }}>
              {displayGrid.slice(TETRIS_HIDDEN_ROWS).map((row, y) =>
                row.map((cell, x) => {
                  let classes = 'w-5 h-5 sm:w-6 sm:h-6 rounded-[2px] transition-colors duration-75'
                  let style: React.CSSProperties = {}
                  
                  // Check if this cell was just locked
                  const isJustLocked = lastLockedCells.some(c => c.x === x && c.y === y)
                  
                  if (!cell) {
                    // Empty cell
                    classes += ' bg-background/30'
                  } else if (cell === 'ghost') {
                    // Ghost piece - subtle outline
                    const ghostColor = currentPiece ? TETROMINO_COLORS[currentPiece.type] : '#888888'
                    style.backgroundColor = `${ghostColor}22`
                    style.border = `1px solid ${ghostColor}`
                  } else if (cell === 'bomb') {
                    // Bomb - simple highlight
                    style.backgroundColor = '#cc4444'
                    style.border = '1px solid #b23a3a'
                  } else if (cell === 'garbage') {
                    // Garbage - simple dark block
                    style.backgroundColor = '#5f5f5f'
                    style.border = '1px solid #4a4a4a'
                  } else {
                    // Regular block - muted 3D
                    const color = TETROMINO_COLORS[cell as TetrominoType]
                    classes += ' block-3d'
                    style.backgroundColor = color
                    style.border = '1px solid rgba(0,0,0,0.25)'
                    style.boxShadow = 'inset 1px 1px 2px rgba(255,255,255,0.25), inset -1px -1px 2px rgba(0,0,0,0.2)'
                  }
                  
                  // Apply animations
                  if (isJustLocked && cell && cell !== 'ghost') {
                    classes += ' animate-block-lock'
                  }
                
                  return (
                    <div key={`${x}-${y}`} className={classes} style={style} />
                  )
                })
              )}
            </div>

            {(clearOverlays.length > 0 || bombOverlays.length > 0) && (
              <div className="absolute inset-0 pointer-events-none">
                {clearOverlays.map(lineY => (
                  <div
                    key={`line-clear-${lineY}`}
                    className="line-clear-overlay"
                    style={{
                      top: `${lineY * rowHeight}%`,
                      height: `${rowHeight}%`,
                    }}
                  />
                ))}
                {bombOverlays.map((pos, idx) => (
                  <div
                    key={`bomb-clear-${pos.x}-${pos.y}-${idx}`}
                    className="bomb-clear-overlay"
                    style={{
                      top: `${pos.y * rowHeight}%`,
                      left: `${pos.x * colWidth}%`,
                      width: `${colWidth}%`,
                      height: `${rowHeight}%`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
        </div>
      </>
    )
  }

  // =====================================
  // RENDER VIEWS
  // =====================================

  // Menu View
  if (gameView === 'menu') {
    return (
      <div ref={containerRef} className="min-h-full w-full flex flex-col items-stretch justify-center p-6">
        <div className="w-full max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Tetris Battle</h1>
            <p className="text-muted-foreground">Infinite Battle Tetris with bomb mechanics</p>
          </div>
          
          {/* Mode Selection */}
          <div className="space-y-3">
            <Button onClick={handleStartSinglePlayer} variant="outline" className="w-full h-16 text-lg">
              <div className="text-left flex-1">
                <div className="font-semibold">Single Player</div>
                <div className="text-xs text-muted-foreground">Local Practice Mode</div>
              </div>
            </Button>
            
            <Button onClick={handleJoinMultiplayer} disabled={!socket?.connected} variant="outline" className="w-full h-16 text-lg">
              <div className="text-left flex-1">
                <div className="font-semibold">Multiplayer</div>
                <div className="text-xs text-muted-foreground">Join World Room</div>
              </div>
              {socket?.connected ? (
                <Badge variant="outline" className="ml-2"><Wifi className="w-3 h-3 mr-1" />Online</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>
              )}
            </Button>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowHelp(true)}>
              <HelpCircle className="w-4 h-4 mr-2" />
              How to Play
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </div>
          
          {/* Controls hint */}
          <p className="text-xs text-muted-foreground text-center">
            ←→ Move · ↑ Rotate · Space Drop · Shift Hold · H Help
          </p>
        </div>
        
        {/* Help Modal */}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    )
  }

  // Lobby View
  if (gameView === 'lobby') {
    return (
      <div ref={containerRef} className="min-h-full w-full flex flex-col items-stretch justify-center p-6">
        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleLeaveLobby}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold">Tetris Lobby</h1>
            </div>
            <Badge variant={lobbyStatus === 'countdown' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {lobbyStatus === 'countdown' ? `Starting in ${countdown}...` : `${lobbyPlayers.length} players`}
            </Badge>
          </div>
          
          {/* Players List */}
          <div className="border rounded-lg divide-y bg-card">
            {lobbyPlayers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Waiting for players to join...
              </div>
            ) : (
              lobbyPlayers.map((player, idx) => (
                <div key={player.odactuserId} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm font-mono">#{idx + 1}</span>
                    <span className={player.odactuserId === user?.id ? 'font-semibold text-primary' : ''}>
                      {player.name}
                    </span>
                    {player.odactuserId === user?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <Badge variant={player.ready ? 'default' : 'outline'}>
                    {player.ready ? '✓ Ready' : 'Waiting'}
                  </Badge>
                </div>
              ))
            )}
          </div>
          
          {/* Ready Button */}
          <Button 
            onClick={handleToggleReady} 
            className="w-full h-14 text-lg" 
            variant={isReady ? 'default' : 'outline'}
          >
            {isReady ? '✓ Ready!' : 'Click when Ready'}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Game starts when 50%+ players are ready (minimum 2 players)
          </p>
        </div>
      </div>
    )
  }

  // Game View
  return (
    <div 
      ref={containerRef} 
      className={`min-h-full w-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Tetris Battle</h1>
          {!isMultiplayer && <Badge variant="secondary">Solo</Badge>}
          {isMultiplayer && <Badge variant="default"><Users className="w-3 h-3 mr-1" />Multiplayer</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-lg font-semibold">{formatTime(gameTime)}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowHelp(true)} title="Help (H)">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsPaused(p => !p)}>
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex gap-6 justify-center items-start w-full max-w-6xl mx-auto">
            {/* Hold */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center font-semibold tracking-wider">HOLD</p>
              <div className={`border border-primary/20 rounded-lg p-3 bg-gradient-to-b from-muted/30 to-background/50 shadow-inner min-w-[60px] min-h-[50px] flex items-center justify-center ${!canHold ? 'opacity-40' : ''}`}
                style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2), 0 0 10px rgba(var(--primary-rgb, 100,100,255), 0.1)' }}
              >
                {heldPiece ? renderPiecePreview(heldPiece) : (
                  <span className="text-xs text-muted-foreground/50">Empty</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Shift / C</p>
              <div className="text-center p-2 rounded-lg bg-gradient-to-b from-destructive/10 to-transparent border border-destructive/20">
                <p className="text-xs text-muted-foreground font-semibold">K.O.</p>
                <p className="text-2xl font-bold text-destructive" style={{ textShadow: koCount > 0 ? '0 0 10px currentColor' : 'none' }}>{koCount}</p>
              </div>
            </div>
            
            {/* Main Grid */}
            <div className="relative">
              {renderGrid()}
              
              {/* Garbage indicator */}
              {garbageBuffer.length > 0 && (
                <div className="absolute -left-3 top-0 bottom-0 w-3 flex flex-col-reverse overflow-hidden rounded-l">
                  <div 
                    className="bg-gradient-to-t from-red-600 via-red-500 to-orange-400 rounded-l transition-all"
                    style={{ 
                      height: `${Math.min(garbageBuffer.reduce((s, g) => s + g.lines, 0) * 5, 100)}%`,
                      boxShadow: 'inset 0 0 6px rgba(255,255,255,0.2)',
                    }} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>
              )}
              
              {/* Score */}
              <div className="mt-2 text-center">
                <p className="text-2xl font-bold">{score.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Lines: {linesCleared}</p>
              </div>
              
              {/* Combo */}
              {combo > 1 && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge 
                    variant="default" 
                    className="text-lg font-bold px-3 py-1"
                    style={{
                      background: `linear-gradient(135deg, hsl(${Math.min(combo * 30, 360)}, 80%, 50%), hsl(${Math.min(combo * 30 + 30, 360)}, 80%, 40%))`,
                      boxShadow: `0 0 8px hsl(${Math.min(combo * 30, 360)}, 80%, 50%)`,
                    }}
                  >
                    🔥 x{combo}
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Next Queue */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center font-semibold tracking-wider">NEXT</p>
              <div className="border border-primary/20 rounded-lg p-2 space-y-1 bg-gradient-to-b from-muted/30 to-background/50 shadow-inner"
                style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2), 0 0 10px rgba(var(--primary-rgb, 100,100,255), 0.1)' }}
              >
                {nextPieces.slice(0, NEXT_QUEUE_SIZE).map((piece, idx) => (
                  <div key={idx} className={`h-10 flex items-center justify-center border-b last:border-b-0 border-border/30 ${idx === 0 ? 'scale-110' : 'opacity-70'}`}>
                    {renderPiecePreview(piece, idx === 0)}
                  </div>
                ))}
              </div>
              
              {/* Stats */}
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between"><span>Level:</span><span className="text-destructive font-bold">{level}</span></div>
                <div className="flex justify-between"><span>LPM:</span><span>{stats.linesPerMinute}</span></div>
                <div className="flex justify-between"><span>Pieces:</span><span>{stats.piecesPlaced}</span></div>
                <div className="flex justify-between"><span>Tetrises:</span><span className="text-primary">{stats.tetrises}</span></div>
              </div>
            </div>
            
            {/* Opponents (multiplayer) */}
            {isMultiplayer && opponents.length > 0 && (
              <div className="hidden lg:block space-y-2 w-28">
                <p className="text-xs text-muted-foreground text-center">OPPONENTS</p>
                {opponents.slice(0, 4).map(opp => (
                  <div key={opp.odactuserId} className={`border rounded p-2 text-xs ${!opp.alive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{opp.name}</span>
                      <Badge variant="outline" className="text-xs"><Trophy className="w-2 h-2" />{opp.koCount}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{opp.alive ? opp.score.toLocaleString() : 'DEAD'}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      
      {/* Pause Overlay */}
      {isPaused && !isGameOver && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-6 p-8 bg-card rounded-xl border shadow-2xl">
            <p className="text-3xl font-bold">PAUSED</p>
            <div className="flex gap-3">
              <Button size="lg" onClick={() => setIsPaused(false)}>
                <Play className="w-5 h-5 mr-2" />Resume
              </Button>
              <Button size="lg" variant="outline" onClick={() => { resetGame(); setGameView('menu') }}>
                Quit
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-6 p-8 bg-card rounded-xl border shadow-2xl">
            <p className="text-3xl font-bold text-destructive">GAME OVER</p>
            <p className="text-5xl font-bold">{score.toLocaleString()}</p>
            <div className="flex gap-6 justify-center text-lg">
              <div><span className="text-muted-foreground">Lines:</span> <span className="font-bold">{linesCleared}</span></div>
              <div><span className="text-muted-foreground">K.O.:</span> <span className="font-bold">{koCount}</span></div>
              <div><span className="text-muted-foreground">Level:</span> <span className="font-bold">{level}</span></div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button size="lg" onClick={() => { resetGame(); isMultiplayer ? setGameView('lobby') : startGame(Date.now()) }}>
                <RotateCcw className="w-5 h-5 mr-2" />Play Again
              </Button>
              <Button size="lg" variant="outline" onClick={() => { resetGame(); setGameView('menu') }}>
                Menu
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

// =====================================
// HELP MODAL COMPONENT
// =====================================

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-xl border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-muted/30">
          <h2 className="text-xl font-bold">Tetris Battle - Help</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-8">
          
          {/* Controls */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Controls</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Move Left</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">←</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">A</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Move Right</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">→</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">D</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Soft Drop</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">↓</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">S</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Hard Drop</span>
                <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">Space</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Rotate Clockwise</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">↑</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">X</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Rotate Counter-Clockwise</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">Z</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">Ctrl</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 bg-primary/5 px-2 rounded -mx-2">
                <span className="font-medium">Hold / Swap</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">Shift</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">C</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Pause</span>
                <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">Esc</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Help</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">H</kbd>
                  <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">F1</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Fullscreen</span>
                <kbd className="px-2 py-0.5 bg-muted rounded border text-sm font-mono">F</kbd>
              </div>
            </div>
          </section>
          
          {/* Hold */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Hold</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs font-mono">Shift</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs font-mono">C</kbd> to hold the current piece.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>If hold is empty: the current piece is stored and a new piece spawns.</li>
                <li>If hold has a piece: the held piece and current piece swap places.</li>
                <li>You can only use hold once per piece. After the piece locks, hold becomes available again.</li>
                <li>When hold is unavailable, the hold box appears dimmed.</li>
              </ul>
            </div>
          </section>
          
          {/* Attack System */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Attack System</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">Lines Cleared</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">Single (1 line)</td><td className="py-1 text-right font-mono">0 lines</td></tr>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">Double (2 lines)</td><td className="py-1 text-right font-mono">1 line</td></tr>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">Triple (3 lines)</td><td className="py-1 text-right font-mono">2 lines</td></tr>
                    <tr><td className="py-1 font-medium">Tetris (4 lines)</td><td className="py-1 text-right font-mono font-bold text-primary">4 lines</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Combo Bonus</p>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">2 combo</td><td className="py-1 text-right font-mono">+1</td></tr>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">3-4 combo</td><td className="py-1 text-right font-mono">+2</td></tr>
                    <tr className="border-b"><td className="py-1 text-muted-foreground">5-6 combo</td><td className="py-1 text-right font-mono">+3</td></tr>
                    <tr><td className="py-1 font-medium">7+ combo</td><td className="py-1 text-right font-mono font-bold text-destructive">+4</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          
          {/* Bomb Mechanic */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Bomb Mechanic</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>In multiplayer, garbage lines contain bomb blocks (red blocks).</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Each garbage line has 9 gray blocks and 1 bomb block.</li>
                <li>Clearing a line that contains a bomb sends +2 extra attack lines.</li>
                <li>Use bombs strategically to turn the tide of battle.</li>
              </ul>
            </div>
          </section>
          
          {/* Multiplayer */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Multiplayer</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Clear lines to send garbage to other players.</li>
                <li>Your attacks target the player with the highest stack.</li>
                <li>The red bar on the left shows incoming garbage.</li>
                <li>Clear lines to cancel incoming garbage before it reaches you.</li>
                <li>Last player standing wins. If time runs out, highest score wins.</li>
              </ul>
            </div>
          </section>
          
          {/* Tips */}
          <section>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Tips</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Keep your stack flat and leave one column open for Tetrises.</li>
              <li>Use hold to save useful pieces (like I or T) for later.</li>
              <li>Build combos by clearing lines consecutively for bonus attack.</li>
              <li>The ghost piece (transparent outline) shows where your piece will land.</li>
              <li>Game speed increases as you level up. Clear lines quickly to survive.</li>
            </ul>
          </section>
          
        </div>
      </div>
    </div>
  )
}
