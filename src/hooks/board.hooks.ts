import { useCallback, useState } from 'react'
import axiosInstance from '@/utils/axios.instance'
import {
  CREATE_BOARD,
  CREATE_CARD,
  CREATE_COMMENT,
  DELETE_BOARD,
  DELETE_CARD,
  DELETE_COMMENT,
  GET_BOARD_BY_ID,
  GET_BOARDS,
  GET_CARDS_BY_BOARD,
  GET_COMMENTS_BY_CARD,
  MOVE_CARD,
  UPDATE_BOARD,
  UPDATE_CARD,
  UPDATE_COMMENT,
} from '@/utils/api.routes'
import type {
  Board,
  Card,
  Comment,
  CreateBoardInput,
  UpdateBoardInput,
  CreateCardInput,
  UpdateCardInput,
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

export const useBoards = () => {
  const [data, setData] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchBoards = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: Board[] }>(GET_BOARDS())
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
    fetchBoards,
  }
}

export const useCreateBoard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createBoard = useCallback(async (input: CreateBoardInput): Promise<Board | null> => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.post<{ status: string; data: Board }>(
        CREATE_BOARD(),
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

export const useCards = () => {
  const [data, setData] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchCards = useCallback(async (boardId: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: Card[] }>(
        GET_CARDS_BY_BOARD(boardId),
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
    fetchCards,
  }
}

export const useCreateCard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const createCard = useCallback(
    async (boardId: string, input: CreateCardInput): Promise<Card | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.post<{ status: string; data: Card }>(
          CREATE_CARD(boardId),
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
    createCard,
  }
}

export const useMoveCard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const moveCard = useCallback(
    async (cardId: string, columnId: string, boardId: string): Promise<Card | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: Card }>(
          MOVE_CARD(cardId),
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
    moveCard,
  }
}

export const useUpdateBoard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateBoard = useCallback(
    async (boardId: string, updates: UpdateBoardInput): Promise<Board | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: Board }>(
          UPDATE_BOARD(boardId),
          updates,
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

export const useUpdateCard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const updateCard = useCallback(
    async (cardId: string, updates: UpdateCardInput): Promise<Card | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.put<{ status: string; data: Card }>(
          UPDATE_CARD(cardId),
          updates,
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
    updateCard,
  }
}

export const useDeleteCard = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    setError(null)
    setLoading(true)

    try {
      await axiosInstance.delete(DELETE_CARD(cardId))
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
    deleteCard,
  }
}

export const useComments = () => {
  const [data, setData] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Errors | null>(null)

  const fetchComments = useCallback(async (cardId: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await axiosInstance.get<{ status: string; data: Comment[] }>(
        GET_COMMENTS_BY_CARD(cardId),
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
    async (cardId: string, content: string): Promise<Comment | null> => {
      setError(null)
      setLoading(true)

      try {
        const response = await axiosInstance.post<{ status: string; data: Comment }>(
          CREATE_COMMENT(cardId),
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

