import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useUsers } from '@/hooks/user.hooks'
import { useMeetInvitations } from '@/composables/meet/useMeetInvitations'
import { useAuthStore } from '@/stores/auth.store'
import { getInitialsFallback } from '@/utils/image.utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface InviteMemberButtonProps {
  meetId: string | null
  className?: string
}

export function InviteMemberButton({ meetId, className }: InviteMemberButtonProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)
  const { users, loading, fetchUsers } = useUsers()
  const { sendInvitation } = useMeetInvitations()
  const currentUser = useAuthStore((state) => state.user)

  const handleOpen = () => {
    setOpen(true)
    if (users.length === 0) {
      fetchUsers()
    }
  }

  const handleInvite = (userId: string) => {
    if (!meetId) return
    setInviting(userId)
    sendInvitation(meetId, userId)
    setTimeout(() => {
      setInviting(null)
      setOpen(false)
      setSearch('')
    }, 1000)
  }

  const filteredUsers = users.filter((user) => {
    if (user.id === currentUser?.id) return false
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={handleOpen}
        title="Invite members"
        className={className}
      >
        <UserPlus className="h-6 w-6 md:h-4 md:w-4 sm:h-5 sm:w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Meeting</DialogTitle>
            <DialogDescription>
              Select a user to invite to this meeting
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="max-h-64 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleInvite(user.id)}
                  disabled={inviting === user.id}
                  className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left flex items-center gap-3 disabled:opacity-50"
                >
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt={user.name || 'User'}
                      className="h-10 w-10 rounded-full"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.onerror = null
                        target.src = getInitialsFallback(user.name || user.email || 'U')
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {(user.name || user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  {inviting === user.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
