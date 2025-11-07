import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket } from '@/hooks/useSocket'

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

  if (isLoading) {
    return fallback
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <>{children}</>
}
