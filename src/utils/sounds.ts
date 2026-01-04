/**
 * Sound utilities for playing notification sounds
 * Uses Web Audio API with fallback to HTML5 Audio
 */

let audioContext: AudioContext | null = null

/**
 * Initialize audio context (lazy initialization)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('[Sounds] Web Audio API not supported:', error)
      return null
    }
  }
  
  // Resume audio context if suspended (required for user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // Ignore errors - will fallback to HTML5 Audio
    })
  }
  
  return audioContext
}

/**
 * Play a tone using Web Audio API
 */
function playTone(frequency: number, duration: number, volume: number = 0.3): void {
  const ctx = getAudioContext()
  if (!ctx) {
    // Fallback to HTML5 Audio
    playToneFallback(frequency, duration, volume)
    return
  }

  try {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (error) {
    console.warn('[Sounds] Failed to play tone with Web Audio API:', error)
    playToneFallback(frequency, duration, volume)
  }
}

/**
 * Fallback: Play tone using HTML5 Audio
 * Note: Web Audio API should be available in all modern browsers
 * This is a minimal fallback that silently fails if Web Audio API is unavailable
 */
function playToneFallback(_frequency: number, _duration: number, _volume: number): void {
  // Web Audio API should be available in modern browsers
  // If we reach here, it means Web Audio API failed, so we silently skip
  // Playing sounds is a nice-to-have feature, not critical
  console.debug('[Sounds] Web Audio API unavailable, skipping sound playback')
}

/**
 * Play a sound when a participant joins the meeting
 * Higher pitch, ascending tone
 */
export function playJoinSound(): void {
  try {
    // Play a pleasant ascending tone (two notes)
    playTone(523.25, 0.1, 0.2) // C5
    setTimeout(() => {
      playTone(659.25, 0.15, 0.2) // E5
    }, 100)
  } catch (error) {
    console.warn('[Sounds] Failed to play join sound:', error)
  }
}

/**
 * Play a sound when a participant leaves the meeting
 * Lower pitch, descending tone
 */
export function playLeaveSound(): void {
  try {
    // Play a descending tone (two notes)
    playTone(659.25, 0.1, 0.2) // E5
    setTimeout(() => {
      playTone(523.25, 0.15, 0.2) // C5
    }, 100)
  } catch (error) {
    console.warn('[Sounds] Failed to play leave sound:', error)
  }
}

