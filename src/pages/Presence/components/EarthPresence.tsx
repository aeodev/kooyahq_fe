import { useState } from 'react'
import { Loader2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTheme } from '@/composables/useTheme'
import CesiumPresence from './CesiumPresence'

export function EarthPresence() {
  const [isViewerReady, setIsViewerReady] = useState(false)
  const { } = useTheme()

  return (
    <Card className="relative h-[500px] sm:h-[600px] overflow-hidden border-border/70 bg-card text-foreground shadow-xl">

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
