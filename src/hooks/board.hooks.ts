import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  CREATE_BOARD,
  CREATE_TICKET,
  CREATE_COMMENT,
  DELETE_BOARD,
  DELETE_TICKET,
  DELETE_COMMENT,
  GET_BOARD_BY_ID,
  GET_BOARDS,
  GET_TICKETS_BY_BOARD,
  GET_COMMENTS_BY_TICKET,
  MOVE_TICKET,
  UPDATE_BOARD,
  UPDATE_TICKET,
  UPDATE_COMMENT,
  TOGGLE_BOARD_FAVORITE,
} from '@/utils/api.routes'
import type {
  Board,
  Card,
  Ticket,
  Comment,
  CardActivity,
  CreateBoardInput,
  UpdateBoardInput,
  CreateCardInput,
  UpdateCardInput,
  CreateTicketInput,
  UpdateTicketInput,
} from '@/types/board'

export type Errors = {
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
        // Handle new error format: { success: false, error: { message, code } }
        const errorObj = data.error as Record<string, unknown> | undefined
        const message =
          (errorObj?.message as string | undefined) ??
          (data.message as string | string[] | undefined) ??
          (data.error as string | undefined) ??
          'Request failed'
        return { message: typeof message === 'string' ? message : 'Request failed', statusCode: status }
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

export const useBoards = (workspaceId?: string, type?: 'kanban' | 'sprint') => {
  const [data, setData] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchBoards = useCallback(async (wsId?: string) => {
    const id = wsId || workspaceId
    if (!id) {
      setData([])
      return []
    }

    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ success: boolean; data: Board[] }>(
        GET_BOARDS(id, type)
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return []
    } finally {
      setLoading(false)
    }
  }, [workspaceId, type])

  const updateBoardFavorite = useCallback((boardId: string, isFavorite: boolean) => {
    setData((prev) =>
      prev.map((board) =>
        board.id === boardId ? { ...board, isFavorite } : board
      )
    )
  }, [])

  const updateBoard = useCallback((updatedBoard: Board) => {
    setData((prev) =>
      prev.map((board) =>
        board.id === updatedBoard.id ? updatedBoard : board
      )
    )
  }, [])

  const addBoard = useCallback((newBoard: Board) => {
    setData((prev) => {
      // Avoid duplicates
      if (prev.find((b) => b.id === newBoard.id)) return prev
      return [...prev, newBoard]
    })
  }, [])

  const removeBoard = useCallback((boardId: string) => {
    setData((prev) => prev.filter((board) => board.id !== boardId))
  }, [])

  return {
    data,
    loading,
    error,
    fetchBoards,
    updateBoardFavorite,
    updateBoard,
    addBoard,
    removeBoard,
  }
}

export const useCreateBoard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createBoard = useCallback(async (workspaceId: string, input: CreateBoardInput): Promise<Board | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ success: boolean; data: Board }>(
        CREATE_BOARD(workspaceId),
        input,
      )
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createBoard,
  }
}

export const useBoard = () => {
  const [data, setData] = useState<Board | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchBoard = useCallback(async (boardId: string) => {
    setData(null)
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: Board }>(
        GET_BOARD_BY_ID(boardId),
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    fetchBoard,
  }
}

export const useTickets = () => {
  const [data, setData] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchTickets = useCallback(async (boardId: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ success: boolean; data: Ticket[] }>(
        GET_TICKETS_BY_BOARD(boardId),
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    fetchTickets,
  }
}

export const useCreateTicket = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createTicket = useCallback(
    async (boardId: string, input: CreateTicketInput): Promise<Ticket | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.post<{ success: boolean; data: Ticket }>(
          CREATE_TICKET(boardId),
          input,
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    createTicket,
  }
}

export const useMoveTicket = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const moveTicket = useCallback(
    async (ticketId: string, columnId: string, boardId: string): Promise<Ticket | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
          MOVE_TICKET(ticketId),
          { columnId, boardId },
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    moveTicket,
  }
}

export const useUpdateBoard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateBoard = useCallback(
    async (boardId: string, updates: UpdateBoardInput['data']): Promise<Board | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ success: boolean; data: Board }>(
          UPDATE_BOARD(boardId),
          {
            timestamp: new Date().toISOString(),
            data: updates,
          },
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    updateBoard,
  }
}

export const useDeleteBoard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteBoard = useCallback(async (boardId: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_BOARD(boardId))
      return true
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    deleteBoard,
  }
}

export const useUpdateTicket = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateTicket = useCallback(
    async (ticketId: string, updates: UpdateTicketInput['data']): Promise<Ticket | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ success: boolean; data: Ticket }>(
          UPDATE_TICKET(ticketId),
          {
            timestamp: new Date().toISOString(),
            data: updates,
          },
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    updateTicket,
  }
}

export const useDeleteTicket = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteTicket = useCallback(async (ticketId: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_TICKET(ticketId))
      return true
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    deleteTicket,
  }
}

export const useComments = () => {
  const [data, setData] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchComments = useCallback(async (ticketId: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ success: boolean; data: Comment[] }>(
        GET_COMMENTS_BY_TICKET(ticketId),
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    fetchComments,
  }
}

export const useCreateComment = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createComment = useCallback(
    async (ticketId: string, content: string): Promise<Comment | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.post<{ success: boolean; data: Comment }>(
          CREATE_COMMENT(ticketId),
          { content },
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    createComment,
  }
}

export const useUpdateComment = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<Comment | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: Comment }>(
        UPDATE_COMMENT(commentId),
        { content },
      )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    updateComment,
  }
}

export const useDeleteComment = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_COMMENT(commentId))
      return true
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    deleteComment,
  }
}

export const useCardActivities = () => {
  const [data, setData] = useState<CardActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchActivities = useCallback(async (cardId: string) => {
    if (!cardId) {
      setData([])
      return []
    }

    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: CardActivity[] }>(
        GET_CARD_ACTIVITIES(cardId),
      )
      setData(response.data.data)
      return response.data.data
    } catch (err) {
      const normalized = normalizeError(err)
      setError(normalized)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    fetchActivities,
  }
}

export const useToggleBoardFavorite = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const toggleFavorite = useCallback(
    async (boardId: string): Promise<{ isFavorite: boolean } | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.post<{ success: boolean; data: { isFavorite: boolean } }>(
          TOGGLE_BOARD_FAVORITE(boardId),
        )
        return response.data.data
      } catch (err) {
        const normalized = normalizeError(err)
        setError(normalized)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    loading,
    error,
    toggleFavorite,
  }
}

