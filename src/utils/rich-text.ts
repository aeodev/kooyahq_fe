import type { RichTextDoc } from '@/types/rich-text'

const EMPTY_DOC: RichTextDoc = { type: 'html', content: '' }

const isHtmlRichTextDoc = (value: unknown): value is RichTextDoc => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as RichTextDoc
  return candidate.type === 'html' && typeof candidate.content === 'string'
}

const parseRichTextDocString = (value: string): RichTextDoc | null => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (isHtmlRichTextDoc(parsed)) {
      return parsed
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
      return { type: 'html', content: parsed.content }
    }
  } catch (error) {
    return null
  }

  return null
}

export const toRichTextDoc = (value: unknown): RichTextDoc => {
  if (!value) return { ...EMPTY_DOC }

  if (typeof value === 'string') {
    const parsed = parseRichTextDocString(value)
    return { type: 'html', content: parsed ? parsed.content : value }
  }

  if (isHtmlRichTextDoc(value)) {
    return value
  }

  if (typeof value === 'object' && typeof (value as { content?: unknown }).content === 'string') {
    return { type: 'html', content: String((value as { content?: unknown }).content ?? '') }
  }

  return { ...EMPTY_DOC }
}

export const richTextDocToHtml = (value: unknown): string => {
  return toRichTextDoc(value).content
}

export const hasRichTextContent = (value: unknown): boolean => {
  return richTextDocToHtml(value).trim().length > 0
}
