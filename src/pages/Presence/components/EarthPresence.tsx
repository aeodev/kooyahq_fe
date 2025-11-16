import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import CesiumPresence from './CesiumPresence'

export function EarthPresence() {
  const [isViewerReady, setIsViewerReady] = useState(false)

  return (
    <Card className="relative h-[420px] overflow-hidden border-border/70 bg-gradient-to-b from-[#050d1b] via-[#060c19] to-[#0a0a14] text-white shadow-xl">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live presence</p>
        </div>
      </div>
      <div className="absolute inset-0">
        <CesiumPresence onViewerReady={() => setIsViewerReady(true)} />
      </div>
      {!isViewerReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-[#050d1b] via-[#060c19] to-[#0a0a14]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
            <p className="text-sm text-white/60">Loading globe...</p>
          </div>
        </div>
      )}
    </Card>
  )
}
