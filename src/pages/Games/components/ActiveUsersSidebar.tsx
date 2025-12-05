import { Users, ChevronRight, Circle, Gamepad2, Hand } from 'lucide-react'
import type { ActiveUser, GameTypeInfo } from '@/types/game'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
    <aside
      className={cn(
        'active-users-sidebar fixed right-0 top-14 md:top-0 z-40 hidden md:flex flex-col',
        'bg-[hsl(var(--ios-sidebar-bg))] backdrop-blur-xl',
        'border-l border-[hsl(var(--ios-sidebar-border))]',
        'h-[calc(100vh-3.5rem)] md:h-screen',
        'shadow-[-4px_0_24px_-4px_rgba(0,0,0,0.08)]',
        collapsed ? 'w-[72px]' : 'w-72'
      )}
      style={{
        transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div className="relative flex items-center px-4 py-3.5 h-[52px]">
        {/* Collapsed icon */}
        <div
          className={cn(
            'sidebar-icon-center absolute inset-0 flex items-center justify-center',
            collapsed ? 'collapsed' : 'expanded'
          )}
        >
          <button
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-xl text-primary hover:bg-[hsl(var(--ios-selection-bg))] hover:scale-105 active:scale-95 transition-all duration-150"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Expand active users"
          >
            <Users className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Expanded header */}
        <div
          className={cn(
            'sidebar-content-fade flex items-center w-full',
            collapsed ? 'collapsed' : 'expanded'
          )}
        >
          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10">
              <Users className="h-4 w-4 text-primary stroke-[1.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Active Now</p>
              <p className="text-[12px] text-muted-foreground">
                {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
              </p>
            </div>
          </div>
          <button
            type="button"
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--ios-selection-bg))] hover:scale-105 active:scale-95 transition-all duration-150"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse active users"
          >
            <ChevronRight className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className={cn(
        'h-px bg-[hsl(var(--ios-divider))] transition-[margin] duration-300 ease-out',
        collapsed ? 'mx-2' : 'mx-4'
      )} />

      {/* User List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {activeUsers.length === 0 ? (
          <div className={cn(
            'flex flex-col items-center justify-center text-muted-foreground',
            collapsed ? 'py-6' : 'py-12'
          )}>
            <div className={cn(
              'flex items-center justify-center rounded-2xl bg-muted/50 mb-3',
              collapsed ? 'h-10 w-10' : 'h-16 w-16'
            )}>
              <Users className={cn(
                'opacity-40 stroke-[1.5]',
                collapsed ? 'h-5 w-5' : 'h-8 w-8'
              )} />
            </div>
            {!collapsed && (
              <>
                <p className="text-[14px] font-medium text-foreground/60">No one's here</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Users will appear when online</p>
              </>
            )}
          </div>
        ) : (
          activeUsers.map((activeUser) => {
            const isCurrentUser = activeUser.id === currentUserId
            const isLoading = inviting === activeUser.id || poking === activeUser.id

            return (
              <DropdownMenu key={activeUser.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'relative w-full rounded-xl text-left transition-all duration-200 ease-out group',
                      'hover:bg-[hsl(var(--ios-selection-bg))]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      collapsed ? 'p-2 flex items-center justify-center' : 'p-2.5 flex items-center gap-3',
                      isLoading && 'opacity-70'
                    )}
                    disabled={isLoading}
                  >
                    {/* Avatar with online indicator */}
                    <div className="relative shrink-0">
                      {isValidImageUrl(activeUser.profilePic) ? (
                        <img
                          src={activeUser.profilePic}
                          alt={activeUser.name}
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-[hsl(var(--ios-divider))]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-sm font-semibold text-primary-foreground ring-1 ring-[hsl(var(--ios-divider))]">
                          {getUserInitials(activeUser.name)}
                        </div>
                      )}
                      {/* Online status indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[hsl(var(--ios-sidebar-bg))]" />
                      </span>
                    </div>

                    {/* User info - only when expanded */}
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-foreground truncate">
                            {activeUser.name}
                          </p>
                          {isCurrentUser && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground">
                          {isLoading ? (
                            <span className="flex items-center gap-1">
                              <Circle className="h-2 w-2 animate-pulse fill-current" />
                              {inviting === activeUser.id ? 'Sending invite...' : 'Poking...'}
                            </span>
                          ) : (
                            'Online'
                          )}
                        </p>
                      </div>
                    )}

                    {/* Hover indicator */}
                    {!isCurrentUser && !collapsed && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                    )}

                    {/* Loading overlay for collapsed state */}
                    {isLoading && collapsed && (
                      <span className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--ios-selection-bg))] rounded-xl">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>

                {!isCurrentUser && (
                  <DropdownMenuContent
                    align="end"
                    side="left"
                    sideOffset={8}
                    className="w-52 p-1.5 rounded-xl border-[hsl(var(--ios-sidebar-border))] bg-[hsl(var(--ios-sidebar-bg))] backdrop-blur-xl shadow-lg"
                  >
                    <div className="px-2 py-1.5 mb-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{activeUser.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Online now
                      </p>
                    </div>

                    <DropdownMenuSeparator className="bg-[hsl(var(--ios-divider))]" />

                    {onPoke && (
                      <DropdownMenuItem
                        onClick={() => handlePokeClick(activeUser.id)}
                        disabled={poking === activeUser.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] cursor-pointer focus:bg-[hsl(var(--ios-selection-bg))]"
                      >
                        <Hand className="h-4 w-4 stroke-[1.5]" />
                        {poking === activeUser.id ? 'Poking...' : 'Poke'}
                      </DropdownMenuItem>
                    )}

                    {onInvite && gameTypes.length > 0 && (
                      <>
                        {onPoke && <DropdownMenuSeparator className="bg-[hsl(var(--ios-divider))]" />}
                        <div className="px-2.5 py-1 mt-0.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Invite to play
                          </p>
                        </div>
                        {gameTypes.map((gameType) => (
                          <DropdownMenuItem
                            key={gameType.type}
                            onClick={() => handleInviteClick(gameType.type, activeUser.id)}
                            disabled={inviting === activeUser.id}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] cursor-pointer focus:bg-[hsl(var(--ios-selection-bg))]"
                          >
                            <Gamepad2 className="h-4 w-4 stroke-[1.5]" />
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

      {/* Footer with count */}
      {activeUsers.length > 0 && !collapsed && (
        <>
          <div className="mx-4 h-px bg-[hsl(var(--ios-divider))]" />
          <div className="px-4 py-3">
            <p className="text-[11px] text-muted-foreground text-center">
              {activeUsers.length} {activeUsers.length === 1 ? 'person is' : 'people are'} active
            </p>
          </div>
        </>
      )}
    </aside>
  )
}





