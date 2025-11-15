import { useEffect, useRef, useState } from 'react'

interface Size {
  width: number
  height: number
}

export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  Size,
] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Set initial size
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    })

    // Create ResizeObserver
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  return [ref, size]
}

