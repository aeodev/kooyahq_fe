import { useState } from 'react'
import { Loader2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTheme } from '@/composables/useTheme'
import CesiumPresence from './CesiumPresence'

export function EarthPresence() {
  const [isViewerReady, setIsViewerReady] = useState(false)
  const { isDark } = useTheme()

  return (
    <Card className="relative h-[500px] sm:h-[600px] overflow-hidden border-border/70 bg-card text-foreground shadow-xl">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-xs uppercase tracking-[0.3em] font-medium">Live Globe</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
      <div className="absolute inset-0">
        <CesiumPresence onViewerReady={() => setIsViewerReady(true)} />
      </div>
      {!isViewerReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading interactive globe...</p>
          </div>
        </div>
      )}
    </Card>
  )
}
