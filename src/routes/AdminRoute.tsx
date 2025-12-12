import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

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
  const can = useAuthStore((state) => state.can)

  if (isLoading) {
    return fallback
  }

  if (!user || !can(PERMISSIONS.ADMIN_READ)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}




