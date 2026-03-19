import { prisma } from './prisma'
import type { Prisma } from '../../generated/prisma/client'

interface LogActivityParams {
  userId?: string
  action: string
  entityType: string
  entityId: string
  details?: Record<string, unknown>
  ipAddress?: string
}

interface LogAuditParams {
  userId: string
  action: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export function logActivity({ userId, action, entityType, entityId, details, ipAddress }: LogActivityParams): void {
  try {
    prisma.activityLog
      .create({
        data: {
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: (details as Prisma.InputJsonValue) ?? undefined,
          ip_address: ipAddress,
        },
      })
      .catch(() => {})
  } catch {
    // silently ignore
  }
}

export function logAudit({ userId, action, details, ipAddress }: LogAuditParams): void {
  try {
    prisma.userAuditLog
      .create({
        data: {
          user_id: userId,
          action,
          details: (details as Prisma.InputJsonValue) ?? undefined,
          ip_address: ipAddress,
        },
      })
      .catch(() => {})
  } catch {
    // silently ignore
  }
}

export function getIpAddress(headers: Record<string, string | undefined>): string | undefined {
  return headers['x-forwarded-for']?.split(',')[0]?.trim() || headers['x-real-ip'] || undefined
}
