import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserSelector, UserAvatar } from '@/components/ui/user-selector'
import { useUsers } from '@/hooks/user.hooks'
import { useAuthStore } from '@/stores/auth.store'
import type { Board } from '@/types/board'

type BoardMembersModalProps = {
  open: boolean
  onClose: () => void
  board: Board | null
  onUpdate: (memberIds: string[]) => Promise<void>
}

export function BoardMembersModal({ open, onClose, board, onUpdate }: BoardMembersModalProps) {
  const { users, loading: usersLoading } = useUsers()
  const currentUser = useAuthStore((state) => state.user)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const boardMembers = board
    ? users.filter((u) => board.memberIds.includes(u.id) || board.ownerId === u.id)
    : []
  const boardOwner = board ? users.find((u) => u.id === board.ownerId) : null

  const handleAddMember = async () => {
    if (!board || !selectedUserId) return
    if (board.memberIds.includes(selectedUserId)) return

    setSaving(true)
    try {
      await onUpdate([...board.memberIds, selectedUserId])
      setSelectedUserId(undefined)
    } catch (error) {
      console.error('Failed to add member:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!board) return
    setSaving(true)
    try {
      await onUpdate(board.memberIds.filter((id) => id !== userId))
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!open || !board) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Board Members</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Owner */}
          {boardOwner && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Owner
              </div>
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                <UserAvatar userId={boardOwner.id} users={users} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{boardOwner.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{boardOwner.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Members ({boardMembers.length})
            </div>
            <div className="space-y-2">
              {boardMembers
                .filter((m) => m.id !== board.ownerId)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 rounded border bg-muted/20"
                  >
                    <UserAvatar userId={member.id} users={users} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                    </div>
                    {board.ownerId === currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={saving}
                        className="h-8 text-xs text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              {boardMembers.filter((m) => m.id !== board.ownerId).length === 0 && (
                <div className="text-sm text-muted-foreground p-4 text-center border rounded">
                  No members yet
                </div>
              )}
            </div>
          </div>

          {/* Add Member */}
          {board.ownerId === currentUser?.id && (
            <div className="pt-4 border-t">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Add Member
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <UserSelector
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="Select user..."
                    className="h-9"
                  />
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || saving || usersLoading}
                  className="h-9"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

