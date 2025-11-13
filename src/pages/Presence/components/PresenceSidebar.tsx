import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    <Card className="flex h-full flex-col border-border/70 bg-card/80 shadow-md">
      <div className="border-b border-border/60 px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Teammates on the globe</p>
        <p className="text-xs text-muted-foreground">
          {users.length === 0
            ? 'Waiting for teammates to share their location.'
            : 'Live avatar list updates instantly for anyone online.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sortedUsers.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {sortedUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} profilePic={user.profilePic} />
                  <div>
                    <p className="font-medium leading-tight text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCoordinates(user.lat, user.lng)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLocate(user.lat, user.lng)}
                    className="h-7 px-3 text-xs"
                  >
                    Locate
                  </Button>
                  <Badge variant="default">Active</Badge>
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
    return <img src={profilePic} alt={name} className="h-10 w-10 rounded-full object-cover" />
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
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
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
      <p>No live teammates yet.</p>
      <p>Share your location to light up the globe.</p>
    </div>
  )
}

