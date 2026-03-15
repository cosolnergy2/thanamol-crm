import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

type RolePermissionGuardProps = {
  role: string
  children: ReactNode
  fallback?: ReactNode
}

export function RolePermissionGuard({ role, children, fallback = null }: RolePermissionGuardProps) {
  const { hasRole, isLoading } = usePermissions()

  if (isLoading) return null

  if (!hasRole(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
