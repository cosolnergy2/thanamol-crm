import { Elysia, t } from 'elysia'
import type { Prisma } from '../../generated/prisma/client'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

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

export const automationRulesRoutes = new Elysia({ prefix: '/api/automation-rules' })
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
        .get('/', async () => {
          const data = await prisma.automationRule.findMany({
            orderBy: { created_at: 'desc' },
          })
          return { data }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const automationRule = await prisma.automationRule.create({
              data: {
                name: body.name,
                trigger_event: body.triggerEvent,
                conditions: (body.conditions ?? {}) as Prisma.InputJsonValue,
                actions: (body.actions ?? []) as Prisma.InputJsonValue,
                is_active: body.isActive ?? true,
              },
            })
            set.status = 201
            return { automationRule }
          },
          { body: createAutomationRuleSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.automationRule.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Automation rule not found' }
            }
            const automationRule = await prisma.automationRule.update({
              where: { id: params.id },
              data: {
                name: body.name,
                trigger_event: body.triggerEvent,
                conditions: body.conditions as Prisma.InputJsonValue | undefined,
                actions: body.actions as Prisma.InputJsonValue | undefined,
                is_active: body.isActive,
              },
            })
            return { automationRule }
          },
          { body: updateAutomationRuleSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.automationRule.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Automation rule not found' }
          }
          await prisma.automationRule.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
