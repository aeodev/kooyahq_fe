// News-related utilities

/**
 * Get color class for news source badge
 */
export function getSourceColor(source: string): string {
  const sourceLower = source.toLowerCase()
  if (sourceLower.includes('openai')) return 'bg-blue-500'
  if (sourceLower.includes('techcrunch')) return 'bg-orange-500'
  if (sourceLower.includes('reddit')) return 'bg-orange-600'
  if (sourceLower.includes('hackernews')) return 'bg-orange-500'
  if (sourceLower.includes('devto')) return 'bg-purple-500'
  if (sourceLower.includes('arxiv')) return 'bg-red-500'
  return 'bg-primary'
}

/**
 * Format source name for display
 */
export function formatSourceName(source: string): string {
  if (source === 'devto-ai' || source === 'devto-ml') return 'Dev.to'
  return source
}
