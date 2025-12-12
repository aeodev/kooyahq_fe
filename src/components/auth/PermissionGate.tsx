import { type PropsWithChildren, type ReactNode, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { Permission } from '@/constants/permissions'

type PermissionGateProps = PropsWithChildren<{
  anyOf?: Permission[]
  allOf?: Permission[]
  fallback?: ReactNode
}>

export function PermissionGate({ anyOf = [], allOf = [], fallback = null, children }: PermissionGateProps) {
  const can = useAuthStore((state) => state.can)

  const allowed = useMemo(() => {
    const hasAny = anyOf.length > 0 ? anyOf.some((permission) => can(permission)) : false
    const hasAll = allOf.length > 0 ? allOf.every((permission) => can(permission)) : false
    if (anyOf.length === 0 && allOf.length === 0) {
      return true
    }
    return hasAny || hasAll
  }, [anyOf, allOf, can])

  if (!allowed) {
    return <>{fallback ?? null}</>
  }

  return <>{children}</>
}
