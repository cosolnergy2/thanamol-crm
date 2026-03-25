import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const templateLineSchema = t.Object({
  category: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  approved_amount: t.Number({ minimum: 0 }),
})

const createTemplateSchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  lines: t.Array(templateLineSchema),
})

const updateTemplateSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  lines: t.Optional(t.Array(templateLineSchema)),
})

export const fmsBudgetTemplatesRoutes = new Elysia({ prefix: '/api/fms' })
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
        .get('/budget-templates', async () => {
          const templates = await prisma.budgetTemplate.findMany({
            orderBy: { created_at: 'desc' },
          })
          return { templates }
        })
        .get('/budget-templates/:id', async ({ params, set }) => {
          const template = await prisma.budgetTemplate.findUnique({ where: { id: params.id } })
          if (!template) {
            set.status = 404
            return { error: 'Template not found' }
          }
          return { template }
        })
        .post(
          '/budget-templates',
          async ({ body }) => {
            const template = await prisma.budgetTemplate.create({
              data: {
                name: body.name,
                description: body.description,
                lines: body.lines,
              },
            })
            return { template }
          },
          { body: createTemplateSchema }
        )
        .put(
          '/budget-templates/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.budgetTemplate.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Template not found' }
            }

            const template = await prisma.budgetTemplate.update({
              where: { id: params.id },
              data: {
                name: body.name,
                description: body.description,
                lines: body.lines,
              },
            })
            return { template }
          },
          { body: updateTemplateSchema }
        )
        .delete('/budget-templates/:id', async ({ params, set }) => {
          const existing = await prisma.budgetTemplate.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Template not found' }
          }

          await prisma.budgetTemplate.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
