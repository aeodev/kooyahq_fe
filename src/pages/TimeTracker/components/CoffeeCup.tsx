import { memo, useId, useMemo } from 'react'
import styles from './CoffeeCup.module.css'

type CoffeeCupProps = {
  progress: number
}

// Steam wisp paths - curved organic shapes
const STEAM_PATHS = [
  { d: 'M0,0 Q2,-8 -1,-16 Q-3,-24 1,-32', x: 35, delay: 0 },
  { d: 'M0,0 Q-3,-10 2,-20 Q0,-30 -2,-38', x: 50, delay: 0.4 },
  { d: 'M0,0 Q4,-7 0,-15 Q-2,-23 3,-30', x: 62, delay: 0.8 },
  { d: 'M0,0 Q-2,-9 3,-18 Q1,-27 -1,-35', x: 42, delay: 1.2 },
  { d: 'M0,0 Q3,-8 -2,-17 Q0,-26 2,-33', x: 56, delay: 1.6 },
]

function CoffeeCupComponent({ progress }: CoffeeCupProps) {
  const id = useId()
  
  // Unique IDs for SVG definitions
  const ids = useMemo(() => ({
    coffeeGradient: `coffee-grad-${id}`,
    cremaGradient: `crema-grad-${id}`,
    cupGradient: `cup-grad-${id}`,
    innerShadow: `inner-shadow-${id}`,
    steamGradient: `steam-grad-${id}`,
    cupClip: `cup-clip-${id}`,
    surfaceGlow: `surface-glow-${id}`,
    puddleGradient: `puddle-grad-${id}`,
  }), [id])
  
  // Calculations
  const fillPercent = Math.min(progress, 100)
  const isOverflow = progress > 100
  const spillIntensity = Math.min((progress - 100) / 50, 1)
  
  const cupHeight = 58
  const fillHeight = (fillPercent / 100) * cupHeight
  const fillY = 92 - fillHeight
  
  const showSteam = progress > 15 && !isOverflow
  const showCrema = progress > 10
  const showBubbles = progress > 20
  
  const getMessage = () => {
    if (progress >= 150) return "Overflowing! 🔥"
    if (progress >= 100) return "Spilling over! ☕"
    if (progress >= 75) return "Almost there..."
    if (progress >= 50) return "Half full"
    if (progress >= 25) return "Warming up"
    if (progress > 0) return "Just started"
    return "Empty cup"
  }

  const ariaLabel = `Coffee cup progress indicator: ${Math.round(progress)}% filled. ${getMessage()}`

  return (
    <div className={styles.container}>
      <div className={styles.cupWrapper}>
        <svg 
          width="100" 
          height="130" 
          viewBox="0 0 100 130"
          className={`${styles.svg} ${isOverflow ? styles.cupShake : ''}`}
          role="img"
          aria-label={ariaLabel}
        >
          <title>{ariaLabel}</title>
          <defs>
            {/* Enhanced coffee gradient with depth */}
            <linearGradient id={ids.coffeeGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7D5A44" />
              <stop offset="30%" stopColor="#6F4E37" />
              <stop offset="60%" stopColor="#5C4033" />
              <stop offset="100%" stopColor="#3C2415" />
            </linearGradient>
            
            {/* Crema gradient with latte art undertone */}
            <radialGradient id={ids.cremaGradient} cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#E8D4BC" />
              <stop offset="35%" stopColor="#D4A574" />
              <stop offset="70%" stopColor="#C4956A" />
              <stop offset="100%" stopColor="#A67B5B" />
            </radialGradient>
            
            {/* Cup body gradient for 3D effect */}
            <linearGradient id={ids.cupGradient} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.9" />
              <stop offset="20%" stopColor="hsl(var(--card))" />
              <stop offset="80%" stopColor="hsl(var(--card))" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.7" />
            </linearGradient>
            
            {/* Inner shadow for cup depth */}
            <linearGradient id={ids.innerShadow} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="black" stopOpacity="0.15" />
              <stop offset="20%" stopColor="black" stopOpacity="0.05" />
              <stop offset="80%" stopColor="black" stopOpacity="0.05" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Steam gradient */}
            <linearGradient id={ids.steamGradient} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
              <stop offset="50%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
            </linearGradient>
            
            {/* Surface glow/highlight */}
            <radialGradient id={ids.surfaceGlow} cx="30%" cy="30%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            
            {/* Puddle gradient */}
            <radialGradient id={ids.puddleGradient} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5C4033" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#3C2415" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2A1810" stopOpacity="0.1" />
            </radialGradient>
            
            {/* Cup interior clip */}
            <clipPath id={ids.cupClip}>
              <path d="M22 34 L22 90 Q22 98 30 98 L70 98 Q78 98 78 90 L78 34 Z" />
            </clipPath>
          </defs>

          {/* Enhanced Steam Wisps */}
          {showSteam && (
            <g>
              {STEAM_PATHS.map((steam, i) => (
                <g key={i} transform={`translate(${steam.x}, 28)`}>
                  <path
                    d={steam.d}
                    fill="none"
                    stroke={`url(#${ids.steamGradient})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    className={styles[`steamWisp${(i % 3) + 1}` as keyof typeof styles]}
                    style={{ animationDelay: `${steam.delay}s` }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Enhanced Spill Effects with Drip Trails */}
          {isOverflow && (
            <g>
              {/* Drip trails down cup side */}
              <path
                d="M20,35 Q18,50 19,65"
                fill="none"
                stroke="#5C4033"
                strokeWidth="3"
                strokeLinecap="round"
                className={styles.trail}
              />
              <path
                d="M80,38 Q82,52 81,68"
                fill="none"
                stroke="#5C4033"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={styles.trail}
                style={{ animationDelay: '0.5s' }}
              />
              
              {/* Falling drips - left side */}
              <ellipse
                cx="19"
                cy="70"
                rx="3"
                ry="4"
                fill="#6F4E37"
                className={styles.drip1}
              />
              <ellipse
                cx="17"
                cy="75"
                rx="2"
                ry="3"
                fill="#5C4033"
                className={styles.drip2}
              />
              
              {/* Falling drips - right side */}
              <ellipse
                cx="81"
                cy="72"
                rx="2.5"
                ry="3.5"
                fill="#6F4E37"
                className={styles.drip3}
              />
              
              {/* Enhanced puddles with ripples */}
              <g style={{ transform: 'translateY(0)' }}>
                {/* Main puddle */}
                <ellipse
                  cx="50"
                  cy="122"
                  rx={18 + spillIntensity * 12}
                  ry={4 + spillIntensity * 2}
                  fill={`url(#${ids.puddleGradient})`}
                  className={styles.puddle}
                />
                {/* Puddle ripple effect */}
                <ellipse
                  cx="50"
                  cy="122"
                  rx={12 + spillIntensity * 8}
                  ry={2 + spillIntensity}
                  fill="none"
                  stroke="#5C4033"
                  strokeWidth="0.5"
                  opacity="0.3"
                  className={styles.puddleRipple}
                />
                {/* Secondary puddles */}
                <ellipse
                  cx="28"
                  cy="120"
                  rx={6 + spillIntensity * 4}
                  ry={2 + spillIntensity * 0.5}
                  fill="#5C4033"
                  opacity={0.35 + spillIntensity * 0.2}
                />
                <ellipse
                  cx="74"
                  cy="121"
                  rx={5 + spillIntensity * 3}
                  ry={1.5 + spillIntensity * 0.5}
                  fill="#5C4033"
                  opacity={0.3 + spillIntensity * 0.15}
                />
              </g>
            </g>
          )}

          {/* Cup Body with 3D Effect */}
          <g>
            {/* Ambient shadow under cup */}
            <ellipse
              cx="52"
              cy="105"
              rx="30"
              ry="5"
              fill="black"
              opacity="0.12"
            />
            <ellipse
              cx="52"
              cy="103"
              rx="26"
              ry="3"
              fill="black"
              opacity="0.06"
            />
            
            {/* Cup outer shape with gradient */}
            <path
              d="M18 32 L18 92 Q18 102 30 102 L70 102 Q82 102 82 92 L82 32 Q82 28 78 28 L22 28 Q18 28 18 32 Z"
              fill={`url(#${ids.cupGradient})`}
              stroke="hsl(var(--border))"
              strokeWidth="2"
            />
            
            {/* Inner shadow for depth */}
            <path
              d="M22 34 L22 90 Q22 96 28 96 L72 96 Q78 96 78 90 L78 34"
              fill={`url(#${ids.innerShadow})`}
            />
            
            {/* Cup rim - enhanced */}
            <path
              d="M20 30 Q20 25 26 25 L74 25 Q80 25 80 30"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Rim highlight */}
            <path
              d="M24 27 Q24 24 30 24 L50 24"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
            
            {/* Coffee Fill */}
            <g clipPath={`url(#${ids.cupClip})`}>
              {/* Main coffee body */}
              <rect
                x="22"
                y={fillY}
                width="56"
                height={fillHeight + 10}
                fill={`url(#${ids.coffeeGradient})`}
                style={{ 
                  transition: 'y 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                }}
              />
              
              {/* Animated wave surface */}
              {fillPercent > 5 && (
                <g transform={`translate(0, ${fillY})`}>
                  {/* Wave layer 1 */}
                  <path
                    d="M23,0 Q35,-2 50,0 Q65,2 77,0 L77,6 L23,6 Z"
                    fill="#5C4033"
                    opacity="0.3"
                    className={styles.wave}
                  />
                  {/* Wave layer 2 */}
                  <path
                    d="M23,0 Q37,1.5 50,-1 Q63,-1.5 77,0 L77,5 L23,5 Z"
                    fill="#6F4E37"
                    opacity="0.4"
                    className={styles.wave2}
                  />
                </g>
              )}
              
              {/* Crema/Surface Layer */}
              {fillPercent > 5 && (
                <ellipse
                  cx="50"
                  cy={fillY + 1}
                  rx="27"
                  ry="4.5"
                  fill={showCrema ? `url(#${ids.cremaGradient})` : "#6F4E37"}
                  className={isOverflow ? styles.coffeeWobble : ''}
                  style={{ 
                    transition: 'cy 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transformOrigin: `50px ${fillY + 1}px`
                  }}
                />
              )}
              
              {/* Surface highlight/reflection */}
              {fillPercent > 10 && (
                <ellipse
                  cx="40"
                  cy={fillY + 0.5}
                  rx="12"
                  ry="2"
                  fill={`url(#${ids.surfaceGlow})`}
                  style={{ transition: 'cy 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
              )}
              
              {/* Micro-bubbles */}
              {showBubbles && (
                <g>
                  <circle
                    cx="35"
                    cy={fillY + 6}
                    r="1.2"
                    fill="#D4A574"
                    className={styles.bubble1}
                  />
                  <circle
                    cx="58"
                    cy={fillY + 8}
                    r="0.9"
                    fill="#D4A574"
                    className={styles.bubble2}
                  />
                  <circle
                    cx="45"
                    cy={fillY + 5}
                    r="1"
                    fill="#C4956A"
                    className={styles.bubble3}
                  />
                  <circle
                    cx="65"
                    cy={fillY + 7}
                    r="0.7"
                    fill="#D4A574"
                    className={styles.bubble4}
                  />
                  <circle
                    cx="30"
                    cy={fillY + 9}
                    r="0.8"
                    fill="#C4956A"
                    className={styles.bubble5}
                  />
                </g>
              )}
              
              {/* Surface ripple effect */}
              {fillPercent > 40 && fillPercent < 100 && (
                <ellipse
                  cx="50"
                  cy={fillY + 1}
                  rx="8"
                  ry="1.5"
                  fill="none"
                  stroke="#D4A574"
                  strokeWidth="0.5"
                  opacity="0.3"
                  className={styles.ripple}
                />
              )}
            </g>
            
            {/* Cup Handle with 3D effect */}
            <g>
              {/* Handle shadow */}
              <path
                d="M83 47 Q102 47 102 62 Q102 77 83 77"
                fill="none"
                stroke="black"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.1"
              />
              {/* Handle main */}
              <path
                d="M82 45 Q100 45 100 62 Q100 79 82 79"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Handle inner detail */}
              <path
                d="M84 52 Q94 52 94 62 Q94 72 84 72"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
              />
              {/* Handle highlight */}
              <path
                d="M85 48 Q96 48 96 58"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.3"
              />
            </g>
          </g>
        </svg>
      </div>
      
      {/* Status message with aria-live for screen readers */}
      <p 
        className={`${styles.message} ${isOverflow ? styles.messageOverflow : styles.messageNormal}`}
        aria-live="polite"
      >
        {getMessage()}
      </p>
    </div>
  )
}

export const CoffeeCup = memo(CoffeeCupComponent)
