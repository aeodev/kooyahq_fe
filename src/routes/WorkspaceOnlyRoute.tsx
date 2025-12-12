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

  // If client tries to access non-workspace routes, redirect to workspace
  if (user?.userType === 'client' && !location.pathname.startsWith('/workspace')) {
    return <Navigate to="/workspace" replace />
  }

  return <>{children}</>
}


