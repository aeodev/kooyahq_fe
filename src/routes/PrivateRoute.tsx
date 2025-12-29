import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket } from '@/composables/useSocket'
import { useTimerGuard } from '@/composables/useTimerGuard'

type PrivateRouteProps = PropsWithChildren<{
  redirectTo?: string
  fallback?: ReactElement | null
}>

export function PrivateRoute({
  children,
  redirectTo = '/login',
  fallback = null,
}: PrivateRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const location = useLocation()

  // Initialize socket connection when authenticated
  useSocket()

  // Initialize timer guard to auto-stop timer when server becomes unreachable
  useTimerGuard()

  if (isLoading) {
    return fallback
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <>{children}</>
}
