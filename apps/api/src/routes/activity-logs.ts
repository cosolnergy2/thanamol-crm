import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const activityLogsRoutes = new Elysia({ prefix: '/api' })
  .use(authPlugin)
  .guard(
    {
      beforeHandle({ authUser, set }) {
        if (!authUser) {
          set.status = 401
          return { error: 'Unauthorized' }
        }
      },
    },
    (app) =>
      app
        .get(
          '/activity-logs',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.userId) {
              where.user_id = query.userId
            }

            if (query.entityType) {
              where.entity_type = query.entityType
            }

            if (query.action) {
              where.action = query.action
            }

            const [total, logs] = await Promise.all([
              prisma.activityLog.count({ where }),
              prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  user: {
                    select: { id: true, first_name: true, last_name: true, email: true },
                  },
                },
              }),
            ])

            return {
              data: logs,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              userId: t.Optional(t.String()),
              entityType: t.Optional(t.String()),
              action: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/audit-logs',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.userId) {
              where.user_id = query.userId
            }

            if (query.action) {
              where.action = query.action
            }

            const [total, logs] = await Promise.all([
              prisma.userAuditLog.count({ where }),
              prisma.userAuditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  user: {
                    select: { id: true, first_name: true, last_name: true, email: true },
                  },
                },
              }),
            ])

            return {
              data: logs,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              userId: t.Optional(t.String()),
              action: t.Optional(t.String()),
            }),
          }
        )
  )
