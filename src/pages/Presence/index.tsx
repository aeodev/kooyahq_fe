import { Badge } from '@/components/ui/badge'
import { usePresenceStore } from '@/stores/presence.store'
import { usePresenceChannel, useLiveLocationSharing } from '@/hooks/presence.hooks'
import { EarthPresence } from './components/EarthPresence'
import { PresenceSidebar } from './components/PresenceSidebar'

export function Presence() {
  usePresenceChannel()
  useLiveLocationSharing()

  const syncing = usePresenceStore((state) => state.syncing)
  const permissionDenied = usePresenceStore((state) => state.permissionDenied)
  const geolocationSupported = usePresenceStore((state) => state.geolocationSupported)
  const users = usePresenceStore((state) => state.users)
  const activeCount = users.filter((user) => user.isActive).length

  const statusLabel = !geolocationSupported
    ? 'Location API unavailable'
    : permissionDenied
      ? 'Enable location access to share your position'
      : 'Ready to share your live location'

  const statusTone = !geolocationSupported
    ? 'border border-border/60 text-muted-foreground'
    : permissionDenied
      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'

  return (
    <section className="space-y-4 sm:space-y-6 lg:space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Presence</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              View teammates on a live globe, broadcast your current location, and keep tabs on who is actively
              collaborating in real time.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{activeCount} of {users.length || 0} teammates active</span>
              {syncing && <span className="text-primary">· syncing latest positions…</span>}
            </div>
          </div>
          <Badge variant="outline" className={statusTone}>
            {statusLabel}
          </Badge>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <EarthPresence />
        <PresenceSidebar />
      </section>
    </section>
  )
}

