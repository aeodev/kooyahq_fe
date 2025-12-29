import { createElement, Fragment } from 'react'
import type { ReactNode } from 'react'

/**
 * Extract quick reply options from content
 */
export function extractQuickReplies(content: string): { text: string; label: string; type?: 'single' | 'multi' }[] {
  const lines = content.split('\n')
  const replies: { text: string; label: string; type?: 'single' | 'multi' }[] = []
  
  // Find all lines that start with bullet points
  const bulletLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet characters: • (bullet), - (hyphen), * (asterisk)
    // Match any bullet followed by any content (with or without space)
    if (/^[-•*]/.test(trimmed)) {
      bulletLines.push(trimmed)
    }
  }
  
  // If there are 3+ bullet points, treat as project list
  if (bulletLines.length >= 3) {
    for (const bulletLine of bulletLines) {
      // Extract text after bullet - handle various spacing formats
      // Remove bullet character and any following whitespace
      let projectName = bulletLine.replace(/^[-•*]\s*/, '').trim()
      
      // Skip empty lines or lines that are just the bullet
      if (!projectName || projectName.length === 0) {
        continue
      }
      
      // Extract the name part (before parentheses or dash details)
      const match = projectName.match(/^([^(]+)/)
      if (match) {
        const label = match[1].trim()
        // Skip if it's too short or looks like a command/question
        if (label.length > 1 && 
            !label.toLowerCase().includes('which') && 
            !label.toLowerCase().includes('select') &&
            !label.toLowerCase().includes('would you') &&
            !label.toLowerCase().includes('track time') &&
            !label.toLowerCase().includes('here are') &&
            !label.toLowerCase().includes('okay') &&
            !label.toLowerCase().includes('multiple')) {
          replies.push({ text: label, label, type: 'multi' })
        }
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

