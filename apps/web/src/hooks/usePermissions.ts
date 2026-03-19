import { useQuery } from '@tanstack/react-query'
import type { UserPermissionsResponse } from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/providers/AuthProvider'

export type UsePermissionsResult = {
  permissions: Record<string, boolean>
  roles: string[]
  hasPermission: (permission: string) => boolean
  hasModulePermission: (module: string, action: string) => boolean
  hasRole: (role: string) => boolean
  isLoading: boolean
  isError: boolean
}

export function usePermissions(): UsePermissionsResult {
  const { currentUser } = useAuth()
  const userId = currentUser?.id ?? ''

  const { data, isLoading, isError } = useQuery({
    queryKey: ['permissions', userId],
    queryFn: () => apiGet<UserPermissionsResponse>(`/users/${userId}/permissions`),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  })

  const permissions = data?.permissions ?? {}
  const roles = currentUser?.roles.map((r) => r.name) ?? []

  function hasPermission(permission: string): boolean {
    return permissions[permission] === true
  }

  function hasModulePermission(module: string, action: string): boolean {
    return permissions[`${module}.${action}`] === true
  }

  function hasRole(role: string): boolean {
    return roles.includes(role)
  }

  return { permissions, roles, hasPermission, hasModulePermission, hasRole, isLoading, isError }
}
