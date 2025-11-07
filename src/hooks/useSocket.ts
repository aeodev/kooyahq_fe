import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useSocketStore } from '@/stores/socket.store'

/**
 * Hook to initialize socket connection when user is authenticated
 * Should be used in a top-level component (e.g., App or PrivateRoute)
 */
export function useSocket() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const token = useAuthStore((state) => state.token)
  const connect = useSocketStore((state) => state.connect)
  const disconnect = useSocketStore((state) => state.disconnect)

  useEffect(() => {
    // Connect when user is authenticated and token is available
    if (user && token && !isLoading) {
      connect()
    } else {
      // Disconnect when user logs out
      disconnect()
    }

    return () => {
      // Cleanup on unmount - check current state, not stale closure values
      const currentUser = useAuthStore.getState().user
      const currentToken = useAuthStore.getState().token
      if (!currentUser || !currentToken) {
        disconnect()
      }
    }
  }, [user, token, isLoading, connect, disconnect])
}

