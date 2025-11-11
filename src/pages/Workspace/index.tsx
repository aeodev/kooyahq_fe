import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBoardStore } from '@/stores/board.store'

type CreateBoardError = { message: string | string[]; statusCode?: number }

export function Workspace() {
  const navigate = useNavigate()
  const boards = useBoardStore((state) => state.boards)
  const boardsLoading = useBoardStore((state) => state.loading.boards)
  const fetchBoards = useBoardStore((state) => state.fetchBoards)
  const createBoard = useBoardStore((state) => state.createBoard)
  const deleteBoard = useBoardStore((state) => state.deleteBoard)
  
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<CreateBoardError | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [boardName, setBoardName] = useState('')
  const [boardType, setBoardType] = useState<'kanban' | 'sprint'>('kanban')
  

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  const handleCreateBoard = async () => {
    if (!boardName.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const board = await createBoard({ name: boardName.trim(), type: boardType })

      if (board) {
        setBoardName('')
        setShowCreateForm(false)
        navigate(`/workspace/${board.id}`)
      } else {
        setCreateError({ message: 'Failed to create board' })
      }
    } catch (error) {
      const serverError = (error as { response?: { data?: CreateBoardError } })?.response?.data
      setCreateError(serverError || { message: 'Failed to create board' })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm('Are you sure you want to delete this board? This action cannot be undone.')

    if (confirmed) {
      setDeleting(true)
      await deleteBoard(boardId)
      setDeleting(false)
      // Board is already removed from store on success
    }
  }

  return (
    <section className="space-y-4 sm:space-y-6 lg:space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Workspace</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Manage your Kanban and Sprint boards. Create boards, organize tasks, and track your work.
            </p>
          </div>
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={creating || boardsLoading}
              className="w-full sm:w-auto"
            >
              Create board
            </Button>
          )}
        </div>
      </header>

      {showCreateForm && (
        <Card className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {createError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {typeof createError.message === 'string'
                  ? createError.message
                  : createError.message.join(', ')}
              </div>
            )}
            <div>
              <Label htmlFor="board-name">Board name</Label>
              <Input
                id="board-name"
                placeholder="My board"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && boardName.trim()) {
                    handleCreateBoard()
                  }
                  if (e.key === 'Escape') {
                    setShowCreateForm(false)
                    setBoardName('')
                  }
                }}
                autoFocus
                className="mt-2"
              />
            </div>

            <div>
              <Label>Board type</Label>
              <div className="mt-2 flex gap-3">
                <Button
                  type="button"
                  variant={boardType === 'kanban' ? 'default' : 'outline'}
                  onClick={() => setBoardType('kanban')}
                  className="flex-1"
                >
                  Kanban
                </Button>
                <Button
                  type="button"
                  variant={boardType === 'sprint' ? 'default' : 'outline'}
                  onClick={() => setBoardType('sprint')}
                  className="flex-1"
                >
                  Sprint
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {boardType === 'kanban'
                  ? 'Kanban: Continuous flow with To do, Doing, Done columns'
                  : 'Sprint: Agile workflow with Backlog, Sprint, Review, Done columns'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreateBoard} disabled={!boardName.trim() || creating}>
                Create board
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setBoardName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {boards.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your boards</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="relative cursor-pointer hover:bg-accent/50 transition-all duration-300 hover:shadow-xl"
                onClick={() => navigate(`/workspace/${board.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{board.name}</CardTitle>
                      <CardDescription>
                        {board.type === 'kanban' ? 'Kanban' : 'Sprint'} board
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => handleDeleteBoard(board.id, e)}
                      disabled={deleting}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        !showCreateForm && (
          <Card className="border-dashed border-border/50 bg-card/40 backdrop-blur-sm p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">
              No boards yet. Create your first board to get started.
            </p>
          </Card>
        )
      )}
    </section>
  )
}
