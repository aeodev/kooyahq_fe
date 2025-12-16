import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

type WorkspaceOnlyRouteProps = PropsWithChildren<{
  fallback?: ReactElement | null
}>

export function WorkspaceOnlyRoute({
  children,
  fallback = null,
}: WorkspaceOnlyRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const location = useLocation()

  if (isLoading) {
    return fallback
  }

  const canNavigateOutsideWorkspace = user?.permissions?.some((permission) =>
    ['system:fullAccess', 'users:view', 'users:manage', 'projects:view', 'projects:manage', 'system:logs'].includes(permission),
  )

  if (user && !canNavigateOutsideWorkspace && !location.pathname.startsWith('/workspace')) {
    return <Navigate to="/workspace" replace />
  }

  return <>{children}</>
}

