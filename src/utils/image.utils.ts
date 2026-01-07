// Image URL utilities

const encodeSvg = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

export const DEFAULT_IMAGE_FALLBACK = encodeSvg(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#e5e7eb"/></svg>'
)

export function getInitialsFallback(
  name: string,
  size: number = 64,
  background: string = '#e2e8f0',
  color: string = '#64748b'
): string {
  const initials = getInitials(name) || '?'
  const fontSize = Math.round(size * 0.4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-family="sans-serif" font-size="${fontSize}" fill="${color}" font-weight="600">${initials}</text>
</svg>`
  return encodeSvg(svg)
}

/**
 * Check if URL is a GIF (exclude GIFs)
 */
export function isGifUrl(url: string): boolean {
  if (!url) return false
  const urlLower = url.toLowerCase().trim()
  const pathOnly = urlLower.split('?')[0].split('#')[0]
  return /\.gif(\?|#|$)/i.test(pathOnly) || pathOnly.endsWith('.gif')
}
