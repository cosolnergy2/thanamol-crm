import { prisma } from '../lib/prisma'

export async function getUserAggregatedPermissions(
  userId: string
): Promise<Record<string, boolean>> {
  const userRoles = await prisma.userRole.findMany({
    where: { user_id: userId },
    include: { role: true },
  })

  const merged: Record<string, boolean> = {}
  for (const ur of userRoles) {
    const rolePerms = ur.role.permissions as Record<string, boolean>
    for (const [key, value] of Object.entries(rolePerms)) {
      if (value === true) {
        merged[key] = true
      }
    }
  }
  return merged
}
