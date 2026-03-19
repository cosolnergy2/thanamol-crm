import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

const updatePreferenceSchema = t.Object({
  notificationType: t.String({ minLength: 1 }),
  emailEnabled: t.Optional(t.Boolean()),
  inAppEnabled: t.Optional(t.Boolean()),
})

export const notificationsRoutes = new Elysia({ prefix: '/api/notifications' })
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
          '/',
          async ({ authUser, query }) => {
            const user = authUser as AuthenticatedUser
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = { user_id: user.id }

            if (query.isRead !== undefined) {
              where.is_read = query.isRead === 'true'
            }

            const [total, notifications] = await Promise.all([
              prisma.notification.count({ where }),
              prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: notifications,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              isRead: t.Optional(t.String()),
            }),
          }
        )
        .put('/read-all', async ({ authUser, headers }) => {
          const user = authUser as AuthenticatedUser
          await prisma.notification.updateMany({
            where: { user_id: user.id, is_read: false },
            data: { is_read: true },
          })
          logActivity({
            userId: user.id,
            action: 'UPDATE',
            entityType: 'Notification',
            entityId: 'bulk',
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
        .put('/:id/read', async ({ authUser, params, headers, set }) => {
          const user = authUser as AuthenticatedUser
          const notification = await prisma.notification.findUnique({
            where: { id: params.id },
          })
          if (!notification) {
            set.status = 404
            return { error: 'Notification not found' }
          }
          if (notification.user_id !== user.id) {
            set.status = 403
            return { error: 'Forbidden' }
          }
          const updated = await prisma.notification.update({
            where: { id: params.id },
            data: { is_read: true },
          })
          logActivity({
            userId: user.id,
            action: 'UPDATE',
            entityType: 'Notification',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { notification: updated }
        })
  )

export const notificationPreferencesRoutes = new Elysia({
  prefix: '/api/notification-preferences',
})
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
        .get('/', async ({ authUser }) => {
          const user = authUser as AuthenticatedUser
          const preferences = await prisma.notificationPreference.findMany({
            where: { user_id: user.id },
            orderBy: { notification_type: 'asc' },
          })
          return { data: preferences }
        })
        .put(
          '/',
          async ({ authUser, body, headers }) => {
            const user = authUser as AuthenticatedUser
            const preference = await prisma.notificationPreference.upsert({
              where: {
                user_id_notification_type: {
                  user_id: user.id,
                  notification_type: body.notificationType,
                },
              },
              update: {
                email_enabled: body.emailEnabled ?? true,
                in_app_enabled: body.inAppEnabled ?? true,
              },
              create: {
                user_id: user.id,
                notification_type: body.notificationType,
                email_enabled: body.emailEnabled ?? true,
                in_app_enabled: body.inAppEnabled ?? true,
              },
            })
            logActivity({
              userId: user.id,
              action: 'UPDATE',
              entityType: 'NotificationPreference',
              entityId: body.notificationType,
              ipAddress: getIpAddress(headers),
            })
            return { preference }
          },
          { body: updatePreferenceSchema }
        )
  )
