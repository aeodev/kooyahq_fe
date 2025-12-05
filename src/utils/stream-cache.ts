/**
 * Temporary cache for MediaStream objects that need to be passed between routes
 * MediaStream objects cannot be cloned/serialized, so we use a temporary in-memory cache
 */

const streamCache = new Map<string, MediaStream>()
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Store a MediaStream in the cache and return a cache key
 */
export function cacheStream(stream: MediaStream): string {
  const key = `stream_${Date.now()}_${Math.random().toString(36).substring(7)}`
  streamCache.set(key, stream)
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    const cachedStream = streamCache.get(key)
    if (cachedStream) {
      cachedStream.getTracks().forEach(track => track.stop())
      streamCache.delete(key)
    }
  }, CACHE_EXPIRY_MS)
  
  return key
}

/**
 * Retrieve a MediaStream from the cache by key
 */
export function getCachedStream(key: string): MediaStream | undefined {
  return streamCache.get(key)
}

/**
 * Remove a stream from the cache (does not stop tracks)
 */
export function removeCachedStream(key: string): void {
  streamCache.delete(key)
}

/**
 * Clear all cached streams and stop their tracks
 */
export function clearStreamCache(): void {
  streamCache.forEach((stream) => {
    stream.getTracks().forEach(track => track.stop())
  })
  streamCache.clear()
}





