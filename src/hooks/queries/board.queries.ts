import { useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '@/utils/axios.instance'
import { GET_BOARDS } from '@/utils/api.routes'
import type { Board } from '@/types/board'

export const boardKeys = {
  all: ['boards'] as const,
  list: (type?: 'kanban' | 'sprint') => [...boardKeys.all, { type }] as const,
}

export function useBoardsQuery(type?: 'kanban' | 'sprint') {
  return useQuery({
    queryKey: boardKeys.list(type),
    queryFn: async () => {
      const response = await axiosInstance.get<{ success: boolean; data: Board[] }>(GET_BOARDS(type))
      return response.data.data
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useBoardsQueryActions() {
  const queryClient = useQueryClient()

  const invalidateBoards = () => {
    queryClient.invalidateQueries({ queryKey: boardKeys.all })
  }

  const updateBoardInCache = (boardId: string, updater: (board: Board) => Board) => {
    queryClient.setQueriesData<Board[]>({ queryKey: boardKeys.all }, (old) => {
      if (!old) return old
      return old.map((board) => (board.id === boardId ? updater(board) : board))
    })
  }

  const addBoardToCache = (board: Board) => {
    queryClient.setQueriesData<Board[]>({ queryKey: boardKeys.all }, (old) => {
      if (!old) return [board]
      if (old.some((b) => b.id === board.id)) return old
      return [...old, board]
    })
  }

  const removeBoardFromCache = (boardId: string) => {
    queryClient.setQueriesData<Board[]>({ queryKey: boardKeys.all }, (old) => {
      if (!old) return old
      return old.filter((board) => board.id !== boardId)
    })
  }

  return {
    invalidateBoards,
    updateBoardInCache,
    addBoardToCache,
    removeBoardFromCache,
  }
}

