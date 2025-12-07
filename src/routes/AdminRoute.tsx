import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

type AdminRouteProps = PropsWithChildren<{
  redirectTo?: string
  fallback?: ReactElement | null
}>

export function AdminRoute({
  children,
  redirectTo = '/',
  fallback = null,
}: AdminRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return fallback
  }

  if (!user?.isAdmin) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}







