import { Card } from '@/components/ui/card'
import CesiumPresence from './CesiumPresence'

export function EarthPresence() {
  return (
    <Card className="relative h-[420px] overflow-hidden border-border/70 bg-gradient-to-b from-[#050d1b] via-[#060c19] to-[#0a0a14] text-white shadow-xl">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live presence</p>
        </div>
      </div>
      <div className="absolute inset-0">
        <CesiumPresence />
      </div>
    </Card>
  )
}
