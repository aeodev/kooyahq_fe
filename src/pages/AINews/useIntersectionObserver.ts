import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(
  options?: IntersectionObserverInit
) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      rootMargin: '100px', // Start loading 100px before entering viewport
      ...options,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options])

  return { elementRef, isIntersecting }
}

