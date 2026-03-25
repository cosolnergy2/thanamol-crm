import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createLineSchema = t.Object({
  category: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  approved_amount: t.Number({ minimum: 0 }),
  notes: t.Optional(t.String()),
})

const updateLineSchema = t.Object({
  category: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  approved_amount: t.Optional(t.Number({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

export const fmsBudgetLinesRoutes = new Elysia({ prefix: '/api/fms' })
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
        .get('/budget/:budgetId/lines', async ({ params, set }) => {
          const budget = await prisma.budget.findUnique({ where: { id: params.budgetId } })
          if (!budget) {
            set.status = 404
            return { error: 'Budget not found' }
          }

          const lines = await prisma.budgetLine.findMany({
            where: { budget_id: params.budgetId },
            orderBy: { created_at: 'asc' },
          })

          return { lines }
        })
        .post(
          '/budget/:budgetId/lines',
          async ({ params, body, set }) => {
            const budget = await prisma.budget.findUnique({ where: { id: params.budgetId } })
            if (!budget) {
              set.status = 404
              return { error: 'Budget not found' }
            }
            if (budget.status === 'CLOSED') {
              set.status = 400
              return { error: 'Cannot add lines to a closed budget' }
            }

            const line = await prisma.budgetLine.create({
              data: {
                budget_id: params.budgetId,
                category: body.category,
                description: body.description,
                approved_amount: body.approved_amount,
                notes: body.notes,
              },
            })

            return { line }
          },
          { body: createLineSchema }
        )
        .put(
          '/lines/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.budgetLine.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Budget line not found' }
            }

            const budget = await prisma.budget.findUnique({ where: { id: existing.budget_id } })
            if (budget?.status === 'CLOSED') {
              set.status = 400
              return { error: 'Cannot update lines of a closed budget' }
            }

            const line = await prisma.budgetLine.update({
              where: { id: params.id },
              data: {
                category: body.category,
                description: body.description,
                approved_amount: body.approved_amount,
                notes: body.notes,
              },
            })

            return { line }
          },
          { body: updateLineSchema }
        )
        .delete('/lines/:id', async ({ params, set }) => {
          const existing = await prisma.budgetLine.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Budget line not found' }
          }

          const budget = await prisma.budget.findUnique({ where: { id: existing.budget_id } })
          if (budget?.status === 'CLOSED') {
            set.status = 400
            return { error: 'Cannot delete lines from a closed budget' }
          }

          await prisma.budgetLine.delete({ where: { id: params.id } })

          return { success: true }
        })
  )
