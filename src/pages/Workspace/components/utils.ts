import { EMOJI_CATEGORIES } from './constants'

export type EmojiCategories = typeof EMOJI_CATEGORIES

/**
 * Filters emojis based on search query
 * @param searchQuery - The search query string
 * @returns Filtered emoji categories
 */
export function filterEmojis(searchQuery: string): Partial<EmojiCategories> {
  if (!searchQuery.trim()) {
    return EMOJI_CATEGORIES
  }

  const searchLower = searchQuery.toLowerCase()
  const filtered: Partial<EmojiCategories> = {}

  Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
    const matchingEmojis = emojis.filter((emoji) => {
      // Search by category name
      if (category.toLowerCase().includes(searchLower)) {
        return true
      }
      // You could also search by emoji name/description if needed
      return emoji.includes(searchLower)
    })

    if (matchingEmojis.length > 0) {
      filtered[category as keyof EmojiCategories] = matchingEmojis
    }
  })

  return filtered
}

