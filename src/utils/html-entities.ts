export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  
  // Create a temporary textarea element to decode HTML entities
  const textarea = document.createElement('textarea')
  textarea.innerHTML = str
  return textarea.value
}





