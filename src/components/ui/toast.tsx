import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? 3000
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        typeStyles[toast.type],
      )}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

class ToastManager {
  private toasts: Toast[] = []
  private listeners: Set<(toasts: Toast[]) => void> = new Set()

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]))
  }

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  show(message: string, type: ToastType = 'info', duration?: number) {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = { id, message, type, duration }
    this.toasts.push(toast)
    this.notify()
    return id
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  }

  success(message: string, duration?: number) {
    return this.show(message, 'success', duration)
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration)
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration)
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration)
  }
}

export const toastManager = new ToastManager()

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts)
    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={(id) => toastManager.remove(id)} />
      ))}
    </div>
  )
}


