import { useEffect, useRef, type RefObject } from 'react'
import { EMOJI_CATEGORIES } from './constants'

type UseEmojiPickerReturn = {
  emojiPickerRef: RefObject<HTMLDivElement | null>
  emojiCategories: typeof EMOJI_CATEGORIES
}

/**
 * Custom hook for emoji picker functionality
 * @param showEmojiPicker - Whether the emoji picker is visible
 * @param onClose - Callback to close the emoji picker
 * @returns Ref for the emoji picker container and emoji categories
 */
export function useEmojiPicker(
  showEmojiPicker: boolean,
  onClose: () => void
): UseEmojiPickerReturn {
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker, onClose])

  return {
    emojiPickerRef,
    emojiCategories: EMOJI_CATEGORIES,
  }
}

