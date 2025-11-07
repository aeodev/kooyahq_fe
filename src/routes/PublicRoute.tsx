import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

type PublicRouteProps = PropsWithChildren<{
  redirectTo?: string
  fallback?: ReactElement | null
}>

export function PublicRoute({
  children,
  redirectTo = '/',
  fallback = null,
}: PublicRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return fallback
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
