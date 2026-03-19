import { prisma } from '../lib/prisma'
import type { GranularPermissions } from '@thanamol/shared'

function isNestedPermissions(permissions: unknown): permissions is GranularPermissions {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return false
  const values = Object.values(permissions as Record<string, unknown>)
  return values.length === 0 || values.some((v) => v !== null && typeof v === 'object' && !Array.isArray(v))
}

function flattenNestedPermissions(nested: GranularPermissions): Record<string, boolean> {
  const flat: Record<string, boolean> = {}

  for (const [module, actions] of Object.entries(nested)) {
    if (!actions || typeof actions !== 'object') continue
    for (const [action, value] of Object.entries(actions)) {
      if (value === true) {
        flat[`${module}.${action}`] = true
      }
    }
  }

  return flat
}

export async function getUserAggregatedPermissions(
  userId: string
): Promise<Record<string, boolean>> {
  const userRoles = await prisma.userRole.findMany({
    where: { user_id: userId },
    include: { role: true },
  })

  const merged: Record<string, boolean> = {}
  for (const ur of userRoles) {
    const rolePerms = ur.role.permissions as Record<string, unknown>

    if (isNestedPermissions(rolePerms)) {
      const flat = flattenNestedPermissions(rolePerms)
      for (const [key, value] of Object.entries(flat)) {
        if (value === true) {
          merged[key] = true
        }
      }
    } else {
      for (const [key, value] of Object.entries(rolePerms)) {
        if (value === true) {
          merged[key] = true
        }
      }
    }
  }
  return merged
}

export function hasModulePermission(
  permissions: Record<string, boolean>,
  module: string,
  action: string
): boolean {
  return permissions[`${module}.${action}`] === true
}
