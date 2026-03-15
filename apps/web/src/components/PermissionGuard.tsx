import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

type PermissionGuardProps = {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissions()

  if (isLoading) return null

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
