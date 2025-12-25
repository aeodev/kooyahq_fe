import { createElement, Fragment } from 'react'
import type { ReactNode } from 'react'

/**
 * Extract quick reply options from content
 */
export function extractQuickReplies(content: string): { text: string; label: string }[] {
  const lines = content.split('\n')
  const replies: { text: string; label: string }[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet points that look like options: "• Board Name (PREFIX) - type"
    if (/^[-•*]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-•*]\s/, '')
      // Extract the name part (before parentheses or dash details)
      const match = text.match(/^([^(]+)/)
      if (match) {
        const label = match[1].trim()
        replies.push({ text: label, label })
      }
    }
  }
  
  return replies
}

/**
 * Format inline elements like **bold**
 */
export function formatInline(text: string): ReactNode {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return createElement('strong', { key: i, className: 'font-semibold' }, part.slice(2, -2))
      }
      return part
    })
  )
}

