import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { usePresenceStore } from '@/stores/presence.store'
import { usePresenceChannel, useLiveLocationSharing } from '@/hooks/presence.hooks'
import { useUsersQuery } from '@/hooks/queries/user.queries'
import { EarthPresence } from './components/EarthPresence'
import { PresenceSidebar } from './components/PresenceSidebar'

export function Presence() {
  usePresenceChannel()
  useLiveLocationSharing()

  const syncing = usePresenceStore((state) => state.syncing)
  const permissionDenied = usePresenceStore((state) => state.permissionDenied)
  const geolocationSupported = usePresenceStore((state) => state.geolocationSupported)
  const locationSharingEnabled = usePresenceStore((state) => state.locationSharingEnabled)
  const setLocationSharingEnabled = usePresenceStore((state) => state.setLocationSharingEnabled)
  const users = usePresenceStore((state) => state.users)
  const { data: allSystemUsers = [] } = useUsersQuery()
  const activeCount = users.filter((user) => user.isActive).length
  const totalUsers = allSystemUsers.length

  const statusLabel = !geolocationSupported
    ? 'Location API unavailable'
    : permissionDenied
      ? 'Enable location access to share your position'
      : locationSharingEnabled
        ? 'Sharing your location'
        : 'Location sharing disabled'

  const statusTone = !geolocationSupported
    ? 'border border-border/60 text-muted-foreground'
    : permissionDenied
      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
      : locationSharingEnabled
        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
        : 'border border-border/60 text-muted-foreground'

  return (
    <section className="space-y-4 sm:space-y-6 lg:space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Presence</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              View teammates on a live globe, broadcast your current location, and keep tabs on who is actively
              collaborating in real time.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {activeCount} of {totalUsers || 0} active
              </Badge>
              {syncing && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing positions…
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 order-2 sm:order-1">
              <Switch
                checked={locationSharingEnabled}
                onCheckedChange={setLocationSharingEnabled}
                disabled={!geolocationSupported || permissionDenied}
              />
              <span className="text-sm font-medium">Share Location</span>
            </div>
            <Badge variant="outline" className={`${statusTone} min-w-[180px] text-xs sm:text-sm text-center px-2 py-1`}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <EarthPresence />
        <PresenceSidebar />
      </section>
    </section>
  )
}
