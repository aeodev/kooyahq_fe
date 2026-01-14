import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, User, Check, Circle, Minus, Palette } from 'lucide-react'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { StatusIndicator } from '@/components/ui/status-indicator'
import type { User as UserType } from '@/types/user'

type UserProfileDropdownProps = {
  user: UserType
  onStatusUpdate: (status: 'online' | 'away' | 'busy' | 'offline') => void
  onCloseMobile: () => void
}

export function UserProfileDropdown({ user, onStatusUpdate, onCloseMobile }: UserProfileDropdownProps) {
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)

  const firstName = user.name?.split(' ')[0] || 'User'
  const initials = user.name
    ?.split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  const isValidProfilePic = user.profilePic && user.profilePic !== 'undefined' && user.profilePic.trim() !== ''
  const isValidBanner = user.banner && user.banner !== 'undefined' && user.banner.trim() !== ''

  const handleNavigate = (path: string) => {
    navigate(path)
    onCloseMobile()
  }

  return (
    <DropdownMenuContent align="end" className="w-80 p-0 ml-3 mb-4 overflow-hidden" side="top" sideOffset={4}>
      {/* Banner Section */}
      <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
        {isValidBanner ? (
          <img
            src={user.banner}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
        )}
        
        {/* Avatar Overlay */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <div className="relative">
            {isValidProfilePic && !imageError ? (
              <img
                key={user.profilePic}
                src={user.profilePic}
                alt={firstName}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-[hsl(var(--ios-sidebar-bg))]"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-lg font-medium text-primary-foreground ring-4 ring-[hsl(var(--ios-sidebar-bg))]">
                {initials || 'KH'}
              </span>
            )}
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusIndicator status={user.status} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* User Info Section */}
      <div className="pt-12 pb-3 px-4 bg-[hsl(var(--ios-sidebar-bg))]">
        <div className="mb-1">
          <p className="text-base font-semibold text-foreground">{firstName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        {user.bio && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{user.bio}</p>
        )}
      </div>

      <DropdownMenuSeparator />

      {/* Status Selection with Submenu */}
      <div className="p-1">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-3 cursor-pointer w-full">
            <div className="flex items-center gap-3 flex-1">
              <StatusIndicator status={user.status || 'offline'} size="sm" />
              <span className="text-sm">
                {user.status === 'online' && 'Online'}
                {user.status === 'busy' && 'Busy'}
                {user.status === 'away' && 'Away'}
                {user.status === 'offline' && 'Invisible'}
                {!user.status && 'Set Status'}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent alignOffset={-8} sideOffset={4}>
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onStatusUpdate('online')}
            >
              <div className="relative">
                <Circle className="h-4 w-4 text-green-500 fill-green-500" />
              </div>
              <div className="flex-1">
                <span className="text-sm">Online</span>
              </div>
              {user.status === 'online' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onStatusUpdate('away')}
            >
              <Moon className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <div className="flex-1">
                <span className="text-sm">Away</span>
              </div>
              {user.status === 'away' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onStatusUpdate('busy')}
            >
              <div className="relative">
                <Circle className="h-4 w-4 text-red-500 fill-red-500" />
                <Minus className="h-2 w-2 text-white absolute inset-0 m-auto" strokeWidth={3} />
              </div>
              <div className="flex-1">
                <span className="text-sm">Busy</span>
                <p className="text-xs text-muted-foreground">You will not receive desktop notifications</p>
              </div>
              {user.status === 'busy' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onStatusUpdate('offline')}
            >
              <div className="relative">
                <Circle className="h-4 w-4 text-gray-500 fill-gray-500" />
              </div>
              <div className="flex-1">
                <span className="text-sm">Invisible</span>
                <p className="text-xs text-muted-foreground">You will appear offline</p>
              </div>
              {user.status === 'offline' && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </div>

      <DropdownMenuSeparator />

      {/* Profile Link */}
      <DropdownMenuItem
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => handleNavigate('/profile')}
      >
        <User className="h-4 w-4" />
        <span className="text-sm">View Profile</span>
      </DropdownMenuItem>

      {/* Personalization */}
      <DropdownMenuItem
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => handleNavigate('/profile/personalization')}
      >
        <Palette className="h-4 w-4" />
        <span className="text-sm">Personalization</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
