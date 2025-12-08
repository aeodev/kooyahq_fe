// Image URL utilities

/**
 * Check if URL is a GIF (exclude GIFs)
 */
export function isGifUrl(url: string): boolean {
  if (!url) return false
  const urlLower = url.toLowerCase().trim()
  const pathOnly = urlLower.split('?')[0].split('#')[0]
  return /\.gif(\?|#|$)/i.test(pathOnly) || pathOnly.endsWith('.gif')
}
