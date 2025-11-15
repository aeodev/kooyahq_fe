import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUsers } from '@/hooks/user.hooks'
import type { User } from '@/types/user'
import { cn } from '@/utils/cn'

type UserSelectorProps = {
  value?: string
  onChange: (userId: string | undefined) => void
  placeholder?: string
  className?: string
  showClear?: boolean
  allowedUserIds?: string[] // Optional: filter to only show these user IDs
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function UserSelector({
  value,
  onChange,
  placeholder = 'Select user...',
  className,
  showClear = true,
  allowedUserIds,
}: UserSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { users, loading, fetchUsers } = useUsers()

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers()
    }
  }, [users.length, fetchUsers])

  useEffect(() => {
    if (open && users.length === 0) {
      fetchUsers()
    }
  }, [open, users.length, fetchUsers])

  // Filter to only allowed users if provided
  const availableUsers = allowedUserIds
    ? users.filter((u) => allowedUserIds.includes(u.id))
    : users

  const selectedUser = availableUsers.find((u) => u.id === value)
  const filteredUsers = search.trim()
    ? availableUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : availableUsers

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn('w-full justify-start', !selectedUser && 'text-muted-foreground')}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {getUserInitials(selectedUser.name)}
            </span>
            <span className="truncate">{selectedUser.name}</span>
          </div>
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-xl max-h-[400px] flex flex-col overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">No users found</div>
              ) : (
                <div className="p-2">
                  {showClear && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(undefined)
                        setOpen(false)
                        setSearch('')
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm rounded-md hover:bg-accent transition-colors mb-1"
                    >
                      <span className="text-muted-foreground font-medium">Unassigned</span>
                    </button>
                  )}
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onChange(user.id)
                        setOpen(false)
                        setSearch('')
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-sm rounded-md hover:bg-accent transition-colors flex items-center gap-3 mb-1',
                        value === user.id && 'bg-accent'
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
        </>
      )}
    </div>
  )
}

export function UserAvatar({ userId, users, size = 'sm' }: { userId?: string; users: User[]; size?: 'sm' | 'md' | 'lg' }) {
  const user = userId ? users.find((u) => u.id === userId) : null

  if (!user) return null

  const initials = getUserInitials(user.name)
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary',
        sizeClasses[size]
      )}
      title={user.name}
    >
      {initials}
    </span>
  )
}

