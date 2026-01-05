import { cn } from '@/utils/cn'
import type { MorganAIState } from '@/composables/meet/useMorganAI'

interface MorganOrbProps {
  state: MorganAIState
  className?: string
}

// Particle configuration for orbital animation
const particles = [
  { size: 4, orbit: 52, speed: 8, delay: 0, color: 'cyan' },
  { size: 3, orbit: 48, speed: 10, delay: 0.5, color: 'violet' },
  { size: 5, orbit: 56, speed: 12, delay: 1, color: 'white' },
  { size: 3, orbit: 44, speed: 9, delay: 1.5, color: 'cyan' },
  { size: 4, orbit: 50, speed: 11, delay: 2, color: 'violet' },
  { size: 2, orbit: 58, speed: 7, delay: 2.5, color: 'white' },
  { size: 3, orbit: 46, speed: 13, delay: 3, color: 'cyan' },
  { size: 4, orbit: 54, speed: 8.5, delay: 3.5, color: 'violet' },
  { size: 2, orbit: 42, speed: 10.5, delay: 4, color: 'white' },
  { size: 3, orbit: 60, speed: 9.5, delay: 4.5, color: 'cyan' },
  { size: 5, orbit: 40, speed: 14, delay: 5, color: 'violet' },
  { size: 2, orbit: 62, speed: 6.5, delay: 5.5, color: 'white' },
  { size: 3, orbit: 38, speed: 11.5, delay: 6, color: 'cyan' },
  { size: 4, orbit: 64, speed: 7.5, delay: 6.5, color: 'violet' },
]

export function MorganOrb({ state, className }: MorganOrbProps) {
  const isListening = state === 'listening'
  const isProcessing = state === 'processing'
  const isSpeaking = state === 'speaking'
  const isActive = isListening || isProcessing || isSpeaking

  // Animation speed and scale based on state
  const speedMultiplier = isSpeaking ? 0.3 : isProcessing ? 0.4 : isListening ? 0.6 : 1
  const orbScale = isSpeaking ? 1.1 : isProcessing ? 1 : isListening ? 0.9 : 1
  const particleScale = isSpeaking ? 1.5 : 1
  const orbitScale = isSpeaking ? 1.2 : 1

  return (
    <div
      className={cn(
        'relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center',
        className
      )}
      style={{ backgroundColor: '#1a1b26' }}
    >
      {/* Cinematic background with subtle mesh gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 0% 0%, rgba(103, 232, 249, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(167, 139, 250, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(103, 232, 249, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(167, 139, 250, 0.15) 0px, transparent 50%),
            linear-gradient(to bottom, #1a1b26, #0f1016)
          `
        }}
      />

      {/* Ambient glow spots - cyan/violet theme */}
      <div
        className={cn(
          'absolute w-40 h-40 rounded-full blur-3xl transition-all duration-1000',
          isActive ? 'opacity-30' : 'opacity-15'
        )}
        style={{
          background: 'radial-gradient(circle, rgba(103,232,249,0.4) 0%, transparent 70%)',
          top: '20%',
          left: '25%'
        }}
      />
      <div
        className={cn(
          'absolute w-32 h-32 rounded-full blur-3xl transition-all duration-1000',
          isActive ? 'opacity-25' : 'opacity-10'
        )}
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)',
          bottom: '25%',
          right: '20%'
        }}
      />

      {/* Particle system - expanded when speaking */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {particles.map((particle, i) => {
          const colorMap = {
            cyan: 'rgba(103,232,249,0.9)',
            violet: 'rgba(167,139,250,0.85)',
            white: 'rgba(255,255,255,0.8)'
          }
          const glowMap = {
            cyan: isSpeaking ? '0 0 12px 3px rgba(103,232,249,0.8)' : '0 0 8px 2px rgba(103,232,249,0.6)',
            violet: isSpeaking ? '0 0 12px 3px rgba(167,139,250,0.8)' : '0 0 8px 2px rgba(167,139,250,0.6)',
            white: isSpeaking ? '0 0 12px 3px rgba(255,255,255,0.6)' : '0 0 8px 2px rgba(255,255,255,0.5)'
          }

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${particle.size * particleScale}px`,
                height: `${particle.size * particleScale}px`,
                background: colorMap[particle.color as keyof typeof colorMap],
                boxShadow: glowMap[particle.color as keyof typeof glowMap],
                animation: `orbit${i % 3} ${particle.speed * speedMultiplier}s linear infinite`,
                animationDelay: `${particle.delay}s`,
                transformOrigin: `${particle.orbit * orbitScale}px center`,
                left: `calc(50% - ${(particle.size * particleScale) / 2}px)`,
                top: `calc(50% - ${(particle.size * particleScale) / 2}px)`,
                filter: particle.size < 3 ? 'blur(0.5px)' : 'none'
              }}
            />
          )
        })}
      </div>

      {/* Core orb - expanded when speaking */}
      <div
        className="absolute rounded-full transition-transform duration-700 overflow-hidden"
        style={{
          transform: `scale(${orbScale})`,
          width: '80px',
          height: '80px',
          boxShadow: isSpeaking
            ? `
              inset 0 0 40px 10px rgba(103,232,249,0.15),
              inset 0 0 20px 5px rgba(167,139,250,0.1),
              0 0 80px 15px rgba(103,232,249,0.3),
              0 0 40px 10px rgba(167,139,250,0.2)
            `
            : isProcessing
            ? `
              inset 0 0 35px 8px rgba(103,232,249,0.12),
              inset 0 0 15px 4px rgba(167,139,250,0.08),
              0 0 60px 12px rgba(103,232,249,0.2),
              0 0 30px 8px rgba(167,139,250,0.15)
            `
            : isListening
            ? `
              inset 0 0 30px 6px rgba(103,232,249,0.1),
              inset 0 0 12px 3px rgba(167,139,250,0.06),
              0 0 50px 10px rgba(103,232,249,0.15),
              0 0 25px 6px rgba(167,139,250,0.1)
            `
            : `
              inset 0 0 25px 5px rgba(103,232,249,0.08),
              0 0 40px 8px rgba(103,232,249,0.1)
            `,
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Swirling Smoke/Fluid Effect Layers */}
        {/* Layer 1: Base fluid mesh - slow rotation */}
        <div 
          className="absolute inset-[-50%]"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(103,232,249,0.4), rgba(167,139,250,0.4), transparent)',
            animation: `spin ${isSpeaking ? '3s' : '8s'} linear infinite`,
            filter: 'blur(20px)',
            opacity: 0.6
          }}
        />

        {/* Layer 2: Secondary fluid mesh - reverse rotation */}
        <div 
          className="absolute inset-[-50%]"
          style={{
            background: 'conic-gradient(from 180deg, transparent, rgba(167,139,250,0.4), rgba(103,232,249,0.4), transparent)',
            animation: `spinReverse ${isSpeaking ? '4s' : '10s'} linear infinite`,
            filter: 'blur(15px)',
            opacity: 0.5
          }}
        />

        {/* Layer 3: Dynamic bright pulses */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.8), transparent 70%)',
            animation: `pulse ${isSpeaking ? '1.5s' : '4s'} ease-in-out infinite`,
            filter: 'blur(10px)',
            opacity: isSpeaking ? 0.6 : 0.3,
            transform: 'scale(0.8)'
          }}
        />

        {/* Top highlight - 3D shine */}
        <div
          className="absolute top-2 left-4 w-12 h-5 rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 100%)',
            filter: 'blur(2px)',
            transform: 'rotate(-15deg)'
          }}
        />
      </div>

      {/* Name label */}
      <div
        className={cn(
          'absolute px-3 py-1 rounded-full transition-all duration-500',
          isSpeaking ? 'bottom-16' : 'bottom-4'
        )}
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(103,232,249,0.2)',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <span className="text-sm text-white font-medium">Morgan AI</span>
        {isActive && (
          <span
            className="ml-2 text-xs"
            style={{ color: 'rgba(103,232,249,0.9)' }}
          >
            {isSpeaking ? 'Speaking' : isProcessing ? 'Thinking' : 'Listening'}
          </span>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div
          className="px-2 py-1 rounded text-xs text-white"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)'
          }}
        >
          Morgan AI
        </div>
        <div className="flex gap-1">
          <div
            className="p-1 rounded"
            style={{
              background: 'rgba(103,232,249,0.7)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes orbit0 {
          from { transform: rotate(0deg) translateX(var(--orbit-radius, 52px)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-radius, 52px)) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: rotate(120deg) translateX(var(--orbit-radius, 48px)) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(var(--orbit-radius, 48px)) rotate(-480deg); }
        }
        @keyframes orbit2 {
          from { transform: rotate(240deg) translateX(var(--orbit-radius, 56px)) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(var(--orbit-radius, 56px)) rotate(-600deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
