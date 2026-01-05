import { useEffect } from 'react'
import { useSocketStore } from '@/stores/socket.store'
import { useAnnouncementQueryActions } from '@/hooks/queries/announcement.queries'

/**
 * Hook to listen for announcement socket events and invalidate React Query cache
 */
export function useAnnouncementSocket() {
  const socket = useSocketStore((state) => state.socket)
  const { invalidateAnnouncements } = useAnnouncementQueryActions()

  useEffect(() => {
    if (!socket) return

    const handleAnnouncementCreated = () => {
      // Invalidate React Query cache to trigger refetch
      invalidateAnnouncements()
    }

    // Listen to custom event dispatched by socket handler
    window.addEventListener('announcement:created', handleAnnouncementCreated)

    return () => {
      window.removeEventListener('announcement:created', handleAnnouncementCreated)
    }
  }, [socket, invalidateAnnouncements])
}


