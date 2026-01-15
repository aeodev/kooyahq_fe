import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock4, Briefcase, Tag, PartyPopper } from 'lucide-react'
import { useActiveUsersQuery, useGameQueryActions } from '@/hooks/queries/game.queries'
import { useUsersQuery, useUserQueryActions } from '@/hooks/queries/user.queries'
import { useTimeEntryStore } from '@/stores/time-entry.store'
import { useSocketStore } from '@/stores/socket.store'
import { useAuthStore } from '@/stores/auth.store'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { cn } from '@/utils/cn'
import type { User } from '@/types/user'
import type { ActiveUser } from '@/types/game'

type ActiveUserWithDetails = {
  id: string
  name: string
  email: string
  profilePic?: string
  status?: User['status']
  birthday?: string
  activeTimer?: {
    task: string
    projects: string[]
    duration: string
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

function calculateActiveDuration(entry: any, now: Date): number {
  if (!entry.startTime) return entry.duration || 0
  
  const start = new Date(entry.startTime)
  let elapsedMs = now.getTime() - start.getTime()
  elapsedMs -= entry.pausedDuration || 0
  
  if (entry.isPaused && entry.lastPausedAt) {
    elapsedMs -= now.getTime() - new Date(entry.lastPausedAt).getTime()
  }
  
  return Math.max(0, Math.floor(elapsedMs / 60000))
}

function isBirthdayToday(birthday?: string): boolean {
  if (!birthday) return false
  const today = new Date()
  const bday = new Date(birthday)
  return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate()
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

type UserTooltipProps = {
  user: ActiveUserWithDetails
  isVisible: boolean
  anchorRef: React.RefObject<HTMLDivElement | null>
  collapsed: boolean
}

function UserTooltip({ user, isVisible, anchorRef, collapsed }: UserTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [arrowPosition, setArrowPosition] = useState<'left' | 'right' | 'top' | 'bottom'>('left')
  const [arrowOffset, setArrowOffset] = useState<number>(0)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !anchorRef.current) {
      setPosition(null)
      setArrowPosition('left')
      setArrowOffset(0)
      return
    }

    const updatePosition = () => {
      if (!anchorRef.current) return

      const rect = anchorRef.current.getBoundingClientRect()
      const tooltipWidth = collapsed ? 260 : 280
      const tooltipHeight = 140 // Adjusted for width/content
      const spacing = 56
      const arrowSize = 8

      let top = 0
      let left = 0
      let newArrowPosition: 'left' | 'right' | 'top' | 'bottom' = 'left'
      let newArrowOffset = 0

      // Calculate avatar center position
      const avatarCenterX = rect.left + rect.width / 2
      const avatarCenterY = rect.top + rect.height / 2

      if (collapsed) {
        // When collapsed, show to the right
        left = rect.right + spacing
        top = avatarCenterY - tooltipHeight / 2 // Center vertically with avatar
        
        // Arrow on left side, pointing left
        newArrowPosition = 'left'
      } else {
        // When expanded, show above or below based on available space
        const spaceAbove = rect.top
        
        if (spaceAbove > tooltipHeight + spacing) {
          // Show above
          top = rect.top - tooltipHeight - spacing
          left = avatarCenterX - tooltipWidth / 2 // Center horizontally with avatar
          
          // Arrow on bottom, pointing down
          newArrowPosition = 'bottom'
        } else {
          // Show below
          top = rect.bottom + spacing
          left = avatarCenterX - tooltipWidth / 2 // Center horizontally with avatar
          
          // Arrow on top, pointing up
          newArrowPosition = 'top'
        }
      }

      // Ensure tooltip stays within viewport
      const maxLeft = window.innerWidth - tooltipWidth - 16
      const maxTop = window.innerHeight - tooltipHeight - 16
      
      left = Math.max(16, Math.min(left, maxLeft))
      top = Math.max(16, Math.min(top, maxTop))

      // Calculate arrow offset AFTER final tooltip position is determined
      // Arrow should point to avatar center
      if (newArrowPosition === 'left') {
        // Arrow on left side - offset from tooltip top to avatar center Y
        newArrowOffset = avatarCenterY - top
      } else {
        // Arrow on top or bottom - offset from tooltip left to avatar center X
        newArrowOffset = avatarCenterX - left
      }

      // Clamp arrow offset to stay within tooltip bounds
      if (newArrowPosition === 'left') {
        newArrowOffset = Math.max(arrowSize + 8, Math.min(newArrowOffset, tooltipHeight - arrowSize - 8))
      } else {
        newArrowOffset = Math.max(arrowSize + 8, Math.min(newArrowOffset, tooltipWidth - arrowSize - 8))
      }

      setPosition({ top, left })
      setArrowPosition(newArrowPosition)
      setArrowOffset(newArrowOffset)
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, anchorRef, collapsed])

  if (!isVisible || !position) return null

  const statusLabels: Record<string, string> = {
    online: 'Online',
    busy: 'Busy',
    away: 'Away',
    offline: 'Offline',
  }

  const statusLabel = user.status ? statusLabels[user.status] || 'Offline' : 'Offline'
  const isBirthday = isBirthdayToday(user.birthday)
  const isLeave = user.status === 'offline' && !isBirthday

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed p-0 border rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] z-[100] pointer-events-none transition-all duration-300 overflow-visible flex flex-col",
        isBirthday
          ? "bg-primary border-[hsl(var(--ios-sidebar-border))]"
          : "bg-[hsl(var(--ios-sidebar-bg))] border-[hsl(var(--ios-sidebar-border))]"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${collapsed ? 260 : 280}px`,
        height: '190px',
      }}
    >
      {/* Arrow pointer */}
      {arrowPosition === 'left' && (
        <>
          {/* Arrow border */}
          <div
            className="absolute w-0 h-0"
            style={{
              left: '-9px',
              top: `${arrowOffset}px`,
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderRight: `9px solid hsl(var(--ios-sidebar-border))`,
              transform: 'translateY(-50%)',
            }}
          />
          {/* Arrow fill */}
          <div
            className="absolute w-0 h-0"
            style={{
              left: '-8px',
              top: `${arrowOffset}px`,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: isBirthday ? '8px solid hsl(var(--primary))' : `8px solid hsl(var(--ios-sidebar-bg))`,
              transform: 'translateY(-50%)',
            }}
          />
        </>
      )}
      {arrowPosition === 'right' && (
        <>
          {/* Arrow border */}
          <div
            className="absolute w-0 h-0"
            style={{
              right: '-9px',
              top: `${arrowOffset}px`,
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderLeft: `9px solid hsl(var(--ios-sidebar-border))`,
              transform: 'translateY(-50%)',
            }}
          />
          {/* Arrow fill */}
          <div
            className="absolute w-0 h-0"
            style={{
              right: '-8px',
              top: `${arrowOffset}px`,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: isBirthday ? '8px solid hsl(var(--primary))' : `8px solid hsl(var(--ios-sidebar-bg))`,
              transform: 'translateY(-50%)',
            }}
          />
        </>
      )}
      {arrowPosition === 'top' && (
        <>
          {/* Arrow border */}
          <div
            className="absolute w-0 h-0"
            style={{
              top: '-9px',
              left: `${arrowOffset}px`,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderBottom: `9px solid hsl(var(--ios-sidebar-border))`,
              transform: 'translateX(-50%)',
            }}
          />
          {/* Arrow fill */}
          <div
            className="absolute w-0 h-0"
            style={{
              top: '-8px',
              left: `${arrowOffset}px`,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: isBirthday ? '8px solid hsl(var(--primary))' : `8px solid hsl(var(--ios-sidebar-bg))`,
              transform: 'translateX(-50%)',
            }}
          />
        </>
      )}
      {arrowPosition === 'bottom' && (
        <>
          {/* Arrow border */}
          <div
            className="absolute w-0 h-0"
            style={{
              bottom: '-9px',
              left: `${arrowOffset}px`,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: `9px solid hsl(var(--ios-sidebar-border))`,
              transform: 'translateX(-50%)',
            }}
          />
          {/* Arrow fill */}
          <div
            className="absolute w-0 h-0"
            style={{
              bottom: '-8px',
              left: `${arrowOffset}px`,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: isBirthday ? '8px solid hsl(var(--primary))' : `8px solid hsl(var(--ios-sidebar-bg))`,
              transform: 'translateX(-50%)',
            }}
          />
        </>
      )}
      
      {/* Visual Header / Status Bar */}
      <div className={cn(
        "px-4 py-2 border-b flex items-center justify-between relative rounded-t-xl",
        isBirthday 
          ? "bg-primary/20 border-primary/30" 
          : "bg-muted/30 border-[hsl(var(--ios-divider))]"
      )}>
        {isBirthday && (
          <div className="absolute top-1 right-1">
            <PartyPopper className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIndicator status={user.status || 'offline'} size="sm" />
          {isBirthday && (
            <span className="text-base leading-none">🎂</span>
          )}
          <div className={cn(
            "text-[13px] font-bold truncate tracking-tight",
            isBirthday ? "text-primary-foreground" : "text-foreground"
          )}>
            {user.name}
          </div>
        </div>
        <div className={cn(
          "px-1.5 h-[14px] flex items-center justify-center rounded-md border",
          isBirthday
            ? "bg-primary-foreground/10 border-primary-foreground/20"
            : "bg-primary/5 border-primary/10"
        )}>
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest leading-none",
            isBirthday ? "text-primary-foreground/90" : "text-primary/70"
          )}>
            {statusLabel}
          </span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-3.5 space-y-3.5 overflow-hidden flex-1 min-h-0">
        {user.activeTimer ? (
          <>
            <div className="space-y-1.5">
              <div className={cn(
                "flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.1em]",
                isBirthday ? "text-primary-foreground/70" : "text-muted-foreground opacity-60"
              )}>
                <Briefcase className="w-2.5 h-2.5" />
                Activity
              </div>
              <div className={cn(
                "text-[13px] font-semibold leading-relaxed px-0.5 line-clamp-2",
                isBirthday ? "text-primary-foreground" : "text-foreground"
              )}>
                {user.activeTimer.task || 'Focusing on tasks'}
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-1">
              <div className={cn(
                "flex-1 flex items-center gap-2.5 px-3 py-2 rounded-md border",
                isBirthday
                  ? "bg-primary-foreground/10 border-primary-foreground/20"
                  : "bg-muted/40 border-[hsl(var(--ios-divider))]"
              )}>
                <Clock4 className={cn(
                  "w-3.5 h-3.5 flex-shrink-0",
                  isBirthday ? "text-primary-foreground" : "text-primary"
                )} />
                <span className={cn(
                  "text-[12px] font-bold tabular-nums tracking-tight",
                  isBirthday ? "text-primary-foreground" : "text-foreground"
                )}>
                  {user.activeTimer.duration}
                </span>
              </div>
              
              {user.activeTimer.projects.length > 0 && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border flex-shrink-0",
                  isBirthday
                    ? "bg-primary-foreground/15 border-primary-foreground/30"
                    : "bg-primary/5 border-primary/10"
                )}>
                  <Tag className={cn(
                    "w-3 h-3 flex-shrink-0",
                    isBirthday ? "text-primary-foreground/80" : "text-primary/70"
                  )} />
                  <span className={cn(
                    "text-[9px] font-bold truncate max-w-[80px] uppercase leading-none",
                    isBirthday ? "text-primary-foreground/90" : "text-primary/80"
                  )}>
                    {user.activeTimer.projects[0]}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={cn(
            "flex flex-col items-center justify-center py-2.5 rounded-md border border-dashed gap-1.5",
            isBirthday
              ? "bg-primary-foreground/10 border-primary-foreground/20"
              : "bg-muted/10 border-[hsl(var(--ios-divider))]"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center",
              isBirthday ? "bg-primary-foreground/20" : "bg-muted/20"
            )}>
              <Briefcase className={cn(
                "w-3 h-3",
                isBirthday ? "text-primary-foreground/40" : "text-muted-foreground/30"
              )} />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.15em]",
              isBirthday ? "text-primary-foreground/60" : "text-muted-foreground/40"
            )}>No Active Timer</span>
          </div>
        )}

        {/* Dynamic Footer Badges */}
        {isLeave && (
          <div className="flex flex-wrap gap-2 pt-1">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 border rounded-md",
              isBirthday
                ? "bg-primary-foreground/10 border-primary-foreground/20"
                : "bg-muted border-[hsl(var(--ios-divider))]"
            )}>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isBirthday ? "text-primary-foreground/90" : "text-muted-foreground"
              )}>Out of Office</span>
              </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(tooltipContent, document.body)
}

type ActiveUserAvatarProps = {
  user: ActiveUserWithDetails
  collapsed: boolean
}

function ActiveUserAvatar({ user, collapsed }: ActiveUserAvatarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const isValidProfilePic = user.profilePic && user.profilePic !== 'undefined' && user.profilePic.trim() !== '' && !imageError
  const initials = getUserInitials(user.name)

  return (
    <>
      <div
        ref={avatarRef}
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          {isValidProfilePic ? (
            <img
              src={user.profilePic}
              alt={user.name}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-[hsl(var(--ios-divider))] cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-xs font-medium text-primary-foreground ring-1 ring-[hsl(var(--ios-divider))] cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              {initials || 'U'}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5">
            <StatusIndicator status={user.status || 'offline'} size="sm" />
          </div>
        </div>
      </div>
      <UserTooltip 
        user={user} 
        isVisible={isHovered} 
        anchorRef={avatarRef}
        collapsed={collapsed} 
      />
    </>
  )
}

type ActiveUsersSectionProps = {
  collapsed: boolean
}

export function ActiveUsersSection({ collapsed }: ActiveUsersSectionProps) {
  const socket = useSocketStore((state) => state.socket)
  const currentUser = useAuthStore((state) => state.user)
  const { data: activeUsers = [] } = useActiveUsersQuery()
  const { setActiveUsers } = useGameQueryActions()
  const { data: allUsers = [] } = useUsersQuery()
  const { updateUserStatus } = useUserQueryActions()
  const allTodayEntries = useTimeEntryStore((state) => state.allTodayEntries)
  const fetchAllEntries = useTimeEntryStore((state) => state.fetchAllTodayEntries)
  
  // Force re-render every minute to update duration display
  const [, setTick] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Listen for active users updates via socket
  useEffect(() => {
    if (!socket?.connected) return

    socket.on('game:active-users', (data: { users: ActiveUser[] }) => {
      setActiveUsers(data.users)
    })

    return () => {
      socket.off('game:active-users')
    }
  }, [socket, setActiveUsers])

  // Listen for user status updates via socket
  useEffect(() => {
    if (!socket?.connected) return

    const handleStatusUpdate = (data: { userId: string; status: string }) => {
      updateUserStatus(data.userId, data.status as 'online' | 'busy' | 'away' | 'offline')
    }

    socket.on('user:status-update', handleStatusUpdate)

    return () => {
      socket.off('user:status-update', handleStatusUpdate)
    }
  }, [socket, updateUserStatus])

  // Filter out current user from all users
  const otherUsers = useMemo(() => {
    if (!currentUser) return allUsers
    return allUsers.filter((u) => u.id !== currentUser.id)
  }, [allUsers, currentUser])

  // Create a map of active users for quick lookup
  const activeUsersMap = useMemo(() => {
    const map = new Map<string, ActiveUser>()
    activeUsers.forEach((user) => {
      map.set(user.id, user)
    })
    return map
  }, [activeUsers])

  // Create entries map by userId
  const entriesMap = useMemo(() => {
    const map = new Map<string, typeof allTodayEntries>()
    allTodayEntries.forEach((entry) => {
      const existing = map.get(entry.userId) || []
      existing.push(entry)
      map.set(entry.userId, existing)
    })
    return map
  }, [allTodayEntries])

  // Combine all users data with user data and timer data
  const usersWithDetails = useMemo<ActiveUserWithDetails[]>(() => {
    const now = new Date()
    
    const usersWithDetailsList: ActiveUserWithDetails[] = []
    
    for (const user of otherUsers) {
      const userEntries = entriesMap.get(user.id) || []
      const activeEntry = userEntries.find((e) => e.isActive)
      
      let activeTimer: ActiveUserWithDetails['activeTimer'] | undefined
      if (activeEntry) {
        const duration = calculateActiveDuration(activeEntry, now)
        activeTimer = {
          task: activeEntry.tasks?.[activeEntry.tasks.length - 1]?.text || 'No task',
          projects: activeEntry.projects || [],
          duration: formatDuration(duration),
        }
      }

      // Get profile pic from activeUsers if available, otherwise use user data
      const activeUser = activeUsersMap.get(user.id)
      
      // Determine status: if user is in activeUsers, use their status, otherwise they're offline
      const userStatus = activeUser ? (user.status || 'online') : 'offline'
      
      usersWithDetailsList.push({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic || activeUser?.profilePic,
        status: userStatus,
        birthday: user.birthday,
        activeTimer,
      })
    }
    
    // Sort: active timers first, then by name
    return usersWithDetailsList.sort((a, b) => {
      if (a.activeTimer && !b.activeTimer) return -1
      if (!a.activeTimer && b.activeTimer) return 1
      return a.name.localeCompare(b.name)
    })
  }, [otherUsers, activeUsersMap, entriesMap])

  // Fetch all entries if we have users but no entries yet
  if (otherUsers.length > 0 && allTodayEntries.length === 0) {
    fetchAllEntries()
  }

  if (usersWithDetails.length === 0) {
    return null
  }

  return (
    <div 
      className="w-full overflow-x-auto overflow-y-hidden px-1" 
      style={{ height: '64px' }}
    >
      <div className={cn(
        'flex gap-x-2 items-center h-full', 
      )}>
        {usersWithDetails.map((user) => (
          <div key={user.id} className="flex items-center justify-center shrink-0">
            <ActiveUserAvatar user={user} collapsed={collapsed} />
          </div>
        ))}
      </div>
    </div>
  )
}
