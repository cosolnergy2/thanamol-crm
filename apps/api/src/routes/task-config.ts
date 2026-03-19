import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const createTaskStatusSchema = t.Object({
  name: t.String({ minLength: 1 }),
  color: t.String({ minLength: 1 }),
  order: t.Number(),
  isDefault: t.Optional(t.Boolean()),
  isClosed: t.Optional(t.Boolean()),
})

const updateTaskStatusSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  color: t.Optional(t.String({ minLength: 1 })),
  order: t.Optional(t.Number()),
  isDefault: t.Optional(t.Boolean()),
  isClosed: t.Optional(t.Boolean()),
})

const createAutomationRuleSchema = t.Object({
  name: t.String({ minLength: 1 }),
  triggerEvent: t.String({ minLength: 1 }),
  conditions: t.Optional(t.Record(t.String(), t.Unknown())),
  actions: t.Optional(t.Array(t.Unknown())),
  isActive: t.Optional(t.Boolean()),
})

const updateAutomationRuleSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  triggerEvent: t.Optional(t.String({ minLength: 1 })),
  conditions: t.Optional(t.Record(t.String(), t.Unknown())),
  actions: t.Optional(t.Array(t.Unknown())),
  isActive: t.Optional(t.Boolean()),
})

export const taskConfigRoutes = new Elysia()
  .use(authPlugin)
  .group('/api/task-statuses', (app) =>
    app
      .guard(
        {
          beforeHandle({ authUser, set }) {
            if (!authUser) {
              set.status = 401
              return { error: 'Unauthorized' }
            }
          },
        },
        (inner) =>
          inner
            .get('/', async () => {
              const statuses = await prisma.taskStatus.findMany({
                orderBy: { order: 'asc' },
              })
              return { data: statuses }
            })
            .post(
              '/',
              async ({ body, authUser, headers, set }) => {
                const existing = await prisma.taskStatus.findUnique({ where: { name: body.name } })
                if (existing) {
                  set.status = 409
                  return { error: 'Task status with this name already exists' }
                }
                const status = await prisma.taskStatus.create({
                  data: {
                    name: body.name,
                    color: body.color,
                    order: body.order,
                    is_default: body.isDefault ?? false,
                    is_closed: body.isClosed ?? false,
                  },
                })
                logActivity({
                  userId: (authUser as AuthenticatedUser).id,
                  action: 'CREATE',
                  entityType: 'TaskStatus',
                  entityId: status.id,
                  ipAddress: getIpAddress(headers),
                })
                set.status = 201
                return { status }
              },
              { body: createTaskStatusSchema }
            )
            .put(
              '/:id',
              async ({ params, body, authUser, headers, set }) => {
                const existing = await prisma.taskStatus.findUnique({ where: { id: params.id } })
                if (!existing) {
                  set.status = 404
                  return { error: 'Task status not found' }
                }
                if (body.name && body.name !== existing.name) {
                  const nameConflict = await prisma.taskStatus.findUnique({
                    where: { name: body.name },
                  })
                  if (nameConflict) {
                    set.status = 409
                    return { error: 'Task status with this name already exists' }
                  }
                }
                const status = await prisma.taskStatus.update({
                  where: { id: params.id },
                  data: {
                    name: body.name,
                    color: body.color,
                    order: body.order,
                    is_default: body.isDefault,
                    is_closed: body.isClosed,
                  },
                })
                logActivity({
                  userId: (authUser as AuthenticatedUser).id,
                  action: 'UPDATE',
                  entityType: 'TaskStatus',
                  entityId: params.id,
                  ipAddress: getIpAddress(headers),
                })
                return { status }
              },
              { body: updateTaskStatusSchema }
            )
            .delete('/:id', async ({ params, authUser, headers, set }) => {
              const existing = await prisma.taskStatus.findUnique({ where: { id: params.id } })
              if (!existing) {
                set.status = 404
                return { error: 'Task status not found' }
              }
              await prisma.taskStatus.delete({ where: { id: params.id } })
              logActivity({
                userId: (authUser as AuthenticatedUser).id,
                action: 'DELETE',
                entityType: 'TaskStatus',
                entityId: params.id,
                ipAddress: getIpAddress(headers),
              })
              return { success: true }
            })
      )
  )
  .group('/api/automation-rules', (app) =>
    app
      .guard(
        {
          beforeHandle({ authUser, set }) {
            if (!authUser) {
              set.status = 401
              return { error: 'Unauthorized' }
            }
          },
        },
        (inner) =>
          inner
            .get('/', async () => {
              const rules = await prisma.automationRule.findMany({
                orderBy: { created_at: 'desc' },
              })
              return { data: rules }
            })
            .post(
              '/',
              async ({ body, authUser, headers, set }) => {
                const rule = await prisma.automationRule.create({
                  data: {
                    name: body.name,
                    trigger_event: body.triggerEvent,
                    conditions: (body.conditions ?? {}) as never,
                    actions: (body.actions ?? []) as never,
                    is_active: body.isActive ?? true,
                  },
                })
                logActivity({
                  userId: (authUser as AuthenticatedUser).id,
                  action: 'CREATE',
                  entityType: 'AutomationRule',
                  entityId: rule.id,
                  ipAddress: getIpAddress(headers),
                })
                set.status = 201
                return { rule }
              },
              { body: createAutomationRuleSchema }
            )
            .put(
              '/:id',
              async ({ params, body, authUser, headers, set }) => {
                const existing = await prisma.automationRule.findUnique({
                  where: { id: params.id },
                })
                if (!existing) {
                  set.status = 404
                  return { error: 'Automation rule not found' }
                }
                const rule = await prisma.automationRule.update({
                  where: { id: params.id },
                  data: {
                    name: body.name,
                    trigger_event: body.triggerEvent,
                    conditions:
                      body.conditions !== undefined
                        ? (body.conditions as never)
                        : undefined,
                    actions:
                      body.actions !== undefined ? (body.actions as never) : undefined,
                    is_active: body.isActive,
                  },
                })
                logActivity({
                  userId: (authUser as AuthenticatedUser).id,
                  action: 'UPDATE',
                  entityType: 'AutomationRule',
                  entityId: params.id,
                  ipAddress: getIpAddress(headers),
                })
                return { rule }
              },
              { body: updateAutomationRuleSchema }
            )
            .delete('/:id', async ({ params, authUser, headers, set }) => {
              const existing = await prisma.automationRule.findUnique({
                where: { id: params.id },
              })
              if (!existing) {
                set.status = 404
                return { error: 'Automation rule not found' }
              }
              await prisma.automationRule.delete({ where: { id: params.id } })
              logActivity({
                userId: (authUser as AuthenticatedUser).id,
                action: 'DELETE',
                entityType: 'AutomationRule',
                entityId: params.id,
                ipAddress: getIpAddress(headers),
              })
              return { success: true }
            })
      )
  )
