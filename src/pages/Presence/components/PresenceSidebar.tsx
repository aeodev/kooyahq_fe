import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { usePresenceStore } from '@/stores/presence.store'
import { getCesiumViewer } from './CesiumPresence/hooks'
import * as Cesium from 'cesium'

export function PresenceSidebar() {
  const users = usePresenceStore((state) => state.users)

  const sortedUsers = [...users]
    .filter((user) => user.isActive)
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleLocate = (lat: number, lng: number) => {
    const viewer = getCesiumViewer()
    if (!viewer) return
    
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, 100),
      duration: 1.5,
    })
  }

  return (
    <Card className="flex h-full flex-col border-border/70 shadow-md">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Active Teammates</p>
          <p className="text-xs text-muted-foreground">
            {sortedUsers.length} online · Click to locate on globe
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sortedUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {sortedUsers.map((user) => (
              <li
                key={user.id}
                className="group flex items-center justify-between rounded-xl border border-border/50 p-3 transition-all hover:border-primary/30 hover:bg-accent/50 hover:shadow-md cursor-pointer"
                onClick={() => handleLocate(user.lat, user.lng)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar name={user.name} profilePic={user.profilePic} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatCoordinates(user.lat, user.lng)}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      Locate
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <Badge variant="outline" className="text-xs">Live</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

function Avatar({ name, profilePic }: { name: string; profilePic?: string }) {
  if (profilePic) {
    return (
      <img 
        src={profilePic} 
        alt={name} 
        className="h-10 w-10 rounded-full object-cover ring-2 ring-background shadow-md" 
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
      />
    )
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-background shadow-md hidden">
      {getInitials(name)}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

function formatCoordinates(lat: number, lng: number): string {
  const latLabel = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
  const lngLabel = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latLabel} ${lngLabel}`
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground space-y-2">
      <Globe className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-base font-medium text-foreground">No active teammates</p>
      <p>Enable location sharing to see your team on the globe.</p>
    </div>
  )
}

