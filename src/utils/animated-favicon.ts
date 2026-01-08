type FaviconFrame = {
  letter: string
  color: string
}

const FRAMES: FaviconFrame[] = [
  { letter: 'K', color: 'hsl(142, 71%, 29%)' },
  { letter: 'O', color: 'hsl(208, 84%, 45%)' },
  { letter: 'O', color: 'hsl(30, 90%, 50%)' },
  { letter: 'Y', color: 'hsl(275, 70%, 45%)' },
  { letter: 'A', color: 'hsl(0, 75%, 50%)' },
]

const FRAME_DURATION_MS = 600
const PAUSE_AT_K_MS = 5000

const SVG_TEMPLATE_START =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<text x="50" y="80" text-anchor="middle" font-family="Poppins, sans-serif" font-size="96" font-weight="700"'
const SVG_TEMPLATE_END = '</text></svg>'

function buildSvg(letter: string, color: string): string {
  return `${SVG_TEMPLATE_START} fill="${color}">${letter}${SVG_TEMPLATE_END}`
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function ensureFaviconLink(): HTMLLinkElement {
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  return link
}

declare global {
  interface Window {
    __kooyaFaviconTimer?: number
  }
}

export function startKooyaFaviconAnimation(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const link = ensureFaviconLink()
  const dataUrls = FRAMES.map((frame) => svgToDataUrl(buildSvg(frame.letter, frame.color)))
  let index = 0
  let lastIndex = -1
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const applyFrame = () => {
    link.href = dataUrls[index]
    const isInitialFrame = lastIndex === -1
    const isWrappedToK = index === 0 && lastIndex === dataUrls.length - 1
    lastIndex = index
    index = (index + 1) % dataUrls.length

    if (prefersReducedMotion) return

    const delay = isInitialFrame || isWrappedToK ? PAUSE_AT_K_MS : FRAME_DURATION_MS
    window.__kooyaFaviconTimer = window.setTimeout(applyFrame, delay)
  }

  if (window.__kooyaFaviconTimer) {
    window.clearTimeout(window.__kooyaFaviconTimer)
  }

  applyFrame()
}
