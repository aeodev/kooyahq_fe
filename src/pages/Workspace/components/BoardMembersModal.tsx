import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/user-selector'
import { useUsers } from '@/hooks/user.hooks'
import { useAuthStore } from '@/stores/auth.store'
import type { Board } from '@/types/board'
import { X, Search, UserPlus } from 'lucide-react'
import { cn } from '@/utils/cn'

type BoardMembersModalProps = {
  open: boolean
  onClose: () => void
  board: Board | null
  onUpdate: (memberIds: string[]) => Promise<void>
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function BoardMembersModal({ open, onClose, board, onUpdate }: BoardMembersModalProps) {
  const { users, loading: usersLoading } = useUsers()
  const currentUser = useAuthStore((state) => state.user)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const boardMembers = board
    ? users.filter((u) => board.memberIds.includes(u.id) || board.ownerId === u.id)
    : []
  const boardOwner = board ? users.find((u) => u.id === board.ownerId) : null
  const membersOnly = board ? boardMembers.filter((m) => m.id !== board.ownerId) : []

  // Available users (not already members)
  const availableUsers = users.filter(
    (u) => u.id !== board?.ownerId && !board?.memberIds.includes(u.id)
  )

  const filteredAvailableUsers = searchQuery.trim()
    ? availableUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableUsers

  const handleAddMember = async (userId: string) => {
    if (!board || !userId) return
    if (board.memberIds.includes(userId)) return

    setSaving(true)
    try {
      await onUpdate([...board.memberIds, userId])
      setSearchQuery('')
      setShowAddSection(false)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
          setShowAddSection(false)
        }
      }
    }

    if (showAddSection) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddSection])

  if (!open || !board) return null

  const canManageMembers = board.ownerId === currentUser?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">Board Members</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {membersOnly.length} {membersOnly.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6">
            {/* Add Member Section - At Top */}
            {canManageMembers && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </h3>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search users to add..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowAddSection(true)
                      }}
                      onFocus={() => setShowAddSection(true)}
                      className="pl-9 h-10"
                    />
                  </div>

                  {/* Dropdown - Appears above if near bottom */}
                  {showAddSection && (
                    <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-xl max-h-[300px] flex flex-col overflow-hidden">
                      <div className="overflow-y-auto">
                        {usersLoading ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                            Loading...
                          </div>
                        ) : filteredAvailableUsers.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                            {searchQuery.trim() ? 'No users found' : 'All users are already members'}
                          </div>
                        ) : (
                          <div className="p-2">
                            {filteredAvailableUsers.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => handleAddMember(user.id)}
                                disabled={saving}
                                className={cn(
                                  'w-full px-3 py-2.5 text-left text-sm rounded-md hover:bg-accent transition-colors flex items-center gap-3 mb-1',
                                  saving && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                  {getUserInitials(user.name)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">{user.name}</div>
                                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Owner Section */}
            {boardOwner && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Owner
                </h3>
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                  <UserAvatar userId={boardOwner.id} users={users} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{boardOwner.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{boardOwner.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Members Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Members
              </h3>
              {membersOnly.length > 0 ? (
                <div className="space-y-2">
                  {membersOnly.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <UserAvatar userId={member.id} users={users} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{member.email}</div>
                      </div>
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={saving}
                          className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-6 text-center border rounded-lg bg-muted/20">
                  No members yet. Add members using the search above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

