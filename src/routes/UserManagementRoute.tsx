import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/constants/permissions'

type UserManagementRouteProps = PropsWithChildren<{
  redirectTo?: string
  fallback?: ReactElement | null
}>

const USER_MANAGEMENT_PERMISSIONS = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.PROJECTS_VIEW,
  PERMISSIONS.PROJECTS_MANAGE,
  PERMISSIONS.SYSTEM_LOGS,
]

export function UserManagementRoute({
  children,
  redirectTo = '/',
  fallback = null,
}: UserManagementRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const can = useAuthStore((state) => state.can)

  if (isLoading) {
    return fallback
  }

  const canAccessUserManagement = USER_MANAGEMENT_PERMISSIONS.some((permission) => can(permission))

  if (!user || !canAccessUserManagement) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

