import { Button } from '@/components/ui/button'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ActiveUser, GameTypeInfo } from '@/types/game'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'

interface ActiveUsersSidebarProps {
  activeUsers: ActiveUser[]
  onInvite?: (gameType: string, invitedUserId: string) => void
  gameTypes?: GameTypeInfo[]
  currentUserId?: string
  onPoke?: (userId: string) => void
}

export function ActiveUsersSidebar({
  activeUsers,
  onInvite,
  gameTypes = [],
  currentUserId,
  onPoke,
}: ActiveUsersSidebarProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [inviting, setInviting] = useState<string | null>(null)
  const [poking, setPoking] = useState<string | null>(null)

  const handleInviteClick = (gameType: string, invitedUserId: string) => {
    setInviting(invitedUserId)
    onInvite?.(gameType, invitedUserId)
    setTimeout(() => setInviting(null), 2000)
  }

  const handlePokeClick = (userId: string) => {
    setPoking(userId)
    onPoke?.(userId)
    setTimeout(() => setPoking(null), 2000)
  }

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const isValidImageUrl = (url?: string): boolean => {
    return !!url && url !== 'undefined' && url.trim() !== '' && !url.includes('undefined')
  }

  return (
    <div
      className={cn(
        'fixed right-0 top-14 md:top-0 z-40 hidden md:flex flex-col border-l border-border bg-background/95 backdrop-blur-sm transition-all duration-300 shadow-lg',
        'h-[calc(100vh-3.5rem)] md:h-screen',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <div className={cn('flex items-center border-b border-border', collapsed ? 'justify-center p-2' : 'justify-between p-2')}>
        <div className={cn('flex items-center gap-2 overflow-hidden transition-all', collapsed && 'hidden')}>
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">
            {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 shrink-0', collapsed ? 'mx-auto' : 'ml-auto')}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand active users' : 'Collapse active users'}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Icons */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {activeUsers.length === 0 ? (
          <div className={cn('flex flex-col items-center justify-center py-8 text-muted-foreground', collapsed && 'py-4')}>
            <Users className={cn('mb-2 opacity-50', collapsed ? 'h-6 w-6' : 'h-8 w-8')} />
            {!collapsed && <p className="text-xs text-center">No users online</p>}
          </div>
        ) : (
          activeUsers.map((activeUser) => {
            const isCurrentUser = activeUser.id === currentUserId
            return (
            <DropdownMenu key={activeUser.id}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'relative w-full rounded-lg border border-border/50 bg-card/30 hover:bg-accent/50 transition-all group',
                    collapsed 
                      ? 'p-2 flex items-center justify-center' 
                      : 'p-3 flex items-center gap-3'
                  )}
                  disabled={inviting === activeUser.id || poking === activeUser.id}
                >
                  {isValidImageUrl(activeUser.profilePic) ? (
                    <img
                      src={activeUser.profilePic}
                      alt={activeUser.name}
                      className={cn(
                        'rounded-full ring-2 ring-border/50 object-cover',
                        'h-10 w-10'
                      )}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div
                      className={cn(
                        'rounded-full ring-2 ring-border/50 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center font-bold text-primary-foreground',
                        collapsed ? 'h-10 w-10 text-xs' : 'h-10 w-10 text-sm'
                      )}
                    >
                      {getUserInitials(activeUser.name)}
                    </div>
                  )}
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {activeUser.name}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                      </p>
                      {(inviting === activeUser.id || poking === activeUser.id) && (
                        <p className="text-xs text-muted-foreground">
                          {inviting === activeUser.id ? 'Inviting...' : 'Poking...'}
                        </p>
                      )}
                    </div>
                  )}
                  {(inviting === activeUser.id || poking === activeUser.id) && collapsed && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              {!isCurrentUser && (
                <DropdownMenuContent 
                  align={collapsed ? 'center' : 'end'} 
                  side={collapsed ? 'left' : 'right'}
                  className="min-w-[160px]"
                >
                  {onPoke && (
                    <DropdownMenuItem
                      onClick={() => handlePokeClick(activeUser.id)}
                      disabled={poking === activeUser.id}
                      className="text-sm"
                    >
                      {poking === activeUser.id ? 'Poking...' : 'Poke'}
                    </DropdownMenuItem>
                  )}
                  {onInvite && gameTypes.length > 0 && (
                    <>
                      {gameTypes.length > 0 && onPoke && (
                        <div className="h-px bg-border my-1" />
                      )}
                      {gameTypes.map((gameType) => (
                        <DropdownMenuItem
                          key={gameType.type}
                          onClick={() => handleInviteClick(gameType.type, activeUser.id)}
                          disabled={inviting === activeUser.id}
                          className="text-sm"
                        >
                          {gameType.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )
          })
        )}
      </div>
    </div>
  )
}





