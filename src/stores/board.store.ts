import { create } from 'zustand'
import axiosInstance from '@/utils/axios.instance'
import {
  CREATE_BOARD,
  CREATE_CARD,
  DELETE_BOARD,
  DELETE_CARD,
  GET_BOARD_BY_ID,
  GET_BOARDS,
  GET_CARDS_BY_BOARD,
  MOVE_CARD,
  UPDATE_BOARD,
  UPDATE_CARD,
  BULK_UPDATE_RANKS,
} from '@/utils/api.routes'
import type {
  Board,
  Card,
  CreateBoardInput,
  UpdateBoardInput,
  CreateCardInput,
  UpdateCardInput,
} from '@/types/board'

type Errors = {
  message: string | string[]
  statusCode?: number
}

function normalizeError(error: unknown): Errors {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error && typeof error === 'object') {
    const anyError = error as Record<string, unknown>

    if ('response' in anyError && anyError.response && typeof anyError.response === 'object') {
      const response = anyError.response as Record<string, unknown>
      const data = response.data as Record<string, unknown> | undefined
      const status = (response.status as number | undefined) ?? undefined

      if (data) {
        const message =
          (data.message as string | string[] | undefined) ??
          (data.error as string | undefined) ??
          'Request failed'
        return { message: message ?? 'Request failed', statusCode: status }
      }

      return {
        message: `Request failed with status ${status ?? 'unknown'}`,
        statusCode: status,
      }
    }

    if ('message' in anyError && typeof anyError.message === 'string') {
      return { message: anyError.message }
    }
  }

  return { message: 'Something went wrong' }
}

type BoardState = {
  boards: Board[]
  currentBoard: Board | null
  cardsByBoardId: Record<string, Card[]>
  loading: {
    boards: boolean
    board: boolean
    cards: Record<string, boolean>
  }
  errors: {
    boards: Errors | null
    board: Errors | null
    cards: Record<string, Errors | null>
  }
}

type BoardActions = {
  fetchBoards: () => Promise<Board[]>
  fetchBoard: (boardId: string) => Promise<Board | null>
  fetchCards: (boardId: string) => Promise<Card[]>
  createBoard: (input: CreateBoardInput) => Promise<Board | null>
  updateBoard: (boardId: string, updates: UpdateBoardInput) => Promise<Board | null>
  deleteBoard: (boardId: string) => Promise<boolean>
  createCard: (boardId: string, input: CreateCardInput) => Promise<Card | null>
  updateCard: (cardId: string, updates: UpdateCardInput) => Promise<Card | null>
  moveCard: (cardId: string, columnId: string, boardId: string) => Promise<Card | null>
  deleteCard: (cardId: string, boardId: string) => Promise<boolean>
  bulkUpdateRanks: (boardId: string, rankUpdates: Array<{ id: string; rank: number }>) => Promise<Card[]>
  setCurrentBoard: (board: Board | null) => void
  clearBoardCache: (boardId: string) => void
}

type BoardStore = BoardState & BoardActions

export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: [],
  currentBoard: null,
  cardsByBoardId: {},
  loading: {
    boards: false,
    board: false,
    cards: {},
  },
  errors: {
    boards: null,
    board: null,
    cards: {},
  },

  fetchBoards: async () => {
    set({ loading: { ...get().loading, boards: true }, errors: { ...get().errors, boards: null } })

    try {
      const response = await axiosInstance.get<{ status: string; data: Board[] }>(GET_BOARDS())
      set({ boards: response.data.data, loading: { ...get().loading, boards: false } })
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: { ...get().errors, boards: normalized },
        loading: { ...get().loading, boards: false },
      })
      return []
    }
  },

  fetchBoard: async (boardId: string) => {
    set({ loading: { ...get().loading, board: true }, errors: { ...get().errors, board: null } })

    try {
      const response = await axiosInstance.get<{ status: string; data: Board }>(
        GET_BOARD_BY_ID(boardId)
      )
      const board = response.data.data

      // Update boards list if board exists there
      const boards = get().boards.map((b) => (b.id === boardId ? board : b))
      set({
        currentBoard: board,
        boards,
        loading: { ...get().loading, board: false },
      })
      return board
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: { ...get().errors, board: normalized },
        loading: { ...get().loading, board: false },
      })
      return null
    }
  },

  fetchCards: async (boardId: string) => {
    set({
      loading: {
        ...get().loading,
        cards: { ...get().loading.cards, [boardId]: true },
      },
      errors: {
        ...get().errors,
        cards: { ...get().errors.cards, [boardId]: null },
      },
    })

    try {
      const response = await axiosInstance.get<{ status: string; data: Card[] }>(
        GET_CARDS_BY_BOARD(boardId)
      )
      const cards = response.data.data
      set({
        cardsByBoardId: { ...get().cardsByBoardId, [boardId]: cards },
        loading: {
          ...get().loading,
          cards: { ...get().loading.cards, [boardId]: false },
        },
      })
      return cards
    } catch (err) {
      const normalized = normalizeError(err)
      set({
        errors: {
          ...get().errors,
          cards: { ...get().errors.cards, [boardId]: normalized },
        },
        loading: {
          ...get().loading,
          cards: { ...get().loading.cards, [boardId]: false },
        },
      })
      return []
    }
  },

  createBoard: async (input: CreateBoardInput) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: Board }>(
        CREATE_BOARD(),
        input
      )
      const board = response.data.data
      set({ boards: [...get().boards, board] })
      return board
    } catch (err) {
      return null
    }
  },

  updateBoard: async (boardId: string, updates: UpdateBoardInput) => {
    try {
      const response = await axiosInstance.put<{ status: string; data: Board }>(
        UPDATE_BOARD(boardId),
        updates
      )
      const updatedBoard = response.data.data

      // Update in boards list
      const boards = get().boards.map((b) => (b.id === boardId ? updatedBoard : b))

      // Update current board if it's the one being updated
      const currentBoard =
        get().currentBoard?.id === boardId ? updatedBoard : get().currentBoard

      set({ boards, currentBoard })
      return updatedBoard
    } catch (err) {
      return null
    }
  },

  deleteBoard: async (boardId: string) => {
    try {
      await axiosInstance.delete(DELETE_BOARD(boardId))

      // Remove from boards list
      const boards = get().boards.filter((b) => b.id !== boardId)

      // Clear current board if it was deleted
      const currentBoard = get().currentBoard?.id === boardId ? null : get().currentBoard

      // Clear cards cache for this board
      const cardsByBoardId = { ...get().cardsByBoardId }
      delete cardsByBoardId[boardId]

      set({ boards, currentBoard, cardsByBoardId })
      return true
    } catch (err) {
      return false
    }
  },

  createCard: async (boardId: string, input: CreateCardInput) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: Card }>(
        CREATE_CARD(boardId),
        input
      )
      const card = response.data.data

      // Add to cards cache
      const existingCards = get().cardsByBoardId[boardId] || []
      set({
        cardsByBoardId: {
          ...get().cardsByBoardId,
          [boardId]: [...existingCards, card],
        },
      })
      return card
    } catch (err) {
      return null
    }
  },

  updateCard: async (cardId: string, updates: UpdateCardInput) => {
    try {
      const response = await axiosInstance.put<{ status: string; data: Card }>(
        UPDATE_CARD(cardId),
        updates
      )
      const updatedCard = response.data.data

      // Update in cards cache for the board
      const cardsByBoardId = { ...get().cardsByBoardId }
      Object.keys(cardsByBoardId).forEach((boardId) => {
        cardsByBoardId[boardId] = cardsByBoardId[boardId].map((c) =>
          c.id === cardId ? updatedCard : c
        )
      })

      set({ cardsByBoardId })
      return updatedCard
    } catch (err) {
      return null
    }
  },

  moveCard: async (cardId: string, columnId: string, boardId: string) => {
    try {
      const response = await axiosInstance.put<{ status: string; data: Card }>(
        MOVE_CARD(cardId),
        { columnId, boardId }
      )
      const updatedCard = response.data.data

      // Update in cards cache
      const cardsByBoardId = { ...get().cardsByBoardId }
      if (cardsByBoardId[boardId]) {
        cardsByBoardId[boardId] = cardsByBoardId[boardId].map((c) =>
          c.id === cardId ? updatedCard : c
        )
      }

      set({ cardsByBoardId })
      return updatedCard
    } catch (err) {
      return null
    }
  },

  deleteCard: async (cardId: string, boardId: string) => {
    try {
      await axiosInstance.delete(DELETE_CARD(cardId))

      // Remove from cards cache
      const cardsByBoardId = { ...get().cardsByBoardId }
      if (cardsByBoardId[boardId]) {
        cardsByBoardId[boardId] = cardsByBoardId[boardId].filter((c) => c.id !== cardId)
      }

      set({ cardsByBoardId })
      return true
    } catch (err) {
      return false
    }
  },

  bulkUpdateRanks: async (boardId: string, rankUpdates: Array<{ id: string; rank: number }>) => {
    try {
      const response = await axiosInstance.post<{ status: string; data: Card[] }>(
        BULK_UPDATE_RANKS(boardId),
        { rankUpdates }
      )
      const updatedCards = response.data.data

      // Update in cards cache
      const cardsByBoardId = { ...get().cardsByBoardId }
      if (cardsByBoardId[boardId]) {
        const cardMap = new Map(updatedCards.map((c) => [c.id, c]))
        cardsByBoardId[boardId] = cardsByBoardId[boardId].map((c) => cardMap.get(c.id) || c)
      }

      set({ cardsByBoardId })
      return updatedCards
    } catch (err) {
      return []
    }
  },

  setCurrentBoard: (board: Board | null) => {
    set({ currentBoard: board })
  },

  clearBoardCache: (boardId: string) => {
    const cardsByBoardId = { ...get().cardsByBoardId }
    delete cardsByBoardId[boardId]
    set({ cardsByBoardId })
  },
}))

