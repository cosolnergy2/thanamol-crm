import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createTransactionSchema = t.Object({
  budgetLineId: t.Optional(t.String()),
  amount: t.Number({ minimum: 0.01 }),
  transactionType: t.Union([t.Literal('COMMITMENT'), t.Literal('ACTUAL'), t.Literal('REVERSAL')]),
  referenceType: t.Optional(t.String()),
  referenceId: t.Optional(t.String()),
  description: t.Optional(t.String()),
  createdBy: t.Optional(t.String()),
})

async function applyTransactionToLine(
  lineId: string,
  amount: number,
  transactionType: 'COMMITMENT' | 'ACTUAL' | 'REVERSAL'
) {
  const line = await prisma.budgetLine.findUnique({ where: { id: lineId } })
  if (!line) return

  const update: Record<string, unknown> = {}
  if (transactionType === 'COMMITMENT') {
    update.committed_amount = line.committed_amount + amount
  } else if (transactionType === 'ACTUAL') {
    update.actual_amount = line.actual_amount + amount
    update.committed_amount = Math.max(0, line.committed_amount - amount)
  } else if (transactionType === 'REVERSAL') {
    update.committed_amount = Math.max(0, line.committed_amount - amount)
  }

  await prisma.budgetLine.update({ where: { id: lineId }, data: update })
}

async function syncBudgetTotals(id: string) {
  const lines = await prisma.budgetLine.findMany({ where: { budget_id: id } })

  const total_committed = lines.reduce((sum, l) => sum + l.committed_amount, 0)
  const total_actual = lines.reduce((sum, l) => sum + l.actual_amount, 0)

  await prisma.budget.update({
    where: { id: id },
    data: { total_committed, total_actual },
  })
}

export const fmsBudgetTransactionsRoutes = new Elysia({ prefix: '/api/fms' })
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
          '/budgets/:id/transactions',
          async ({ params, query, set }) => {
            const budget = await prisma.budget.findUnique({ where: { id: params.id } })
            if (!budget) {
              set.status = 404
              return { error: 'Budget not found' }
            }

            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 50)
            const skip = (page - 1) * limit

            const [total, transactions] = await Promise.all([
              prisma.budgetTransaction.count({ where: { budget_id: params.id } }),
              prisma.budgetTransaction.findMany({
                where: { budget_id: params.id },
                include: {
                  budget_line: true,
                  creator: { select: { id: true, first_name: true, last_name: true } },
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: transactions,
              pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/budgets/:id/transactions',
          async ({ params, body, set }) => {
            const budget = await prisma.budget.findUnique({ where: { id: params.id } })
            if (!budget) {
              set.status = 404
              return { error: 'Budget not found' }
            }
            if (budget.status !== 'ACTIVE') {
              set.status = 400
              return { error: 'Transactions can only be created for ACTIVE budgets' }
            }

            if (body.budgetLineId) {
              const line = await prisma.budgetLine.findUnique({ where: { id: body.budgetLineId } })
              if (!line || line.budget_id !== params.id) {
                set.status = 400
                return { error: 'Budget line does not belong to this budget' }
              }
            }

            const transaction = await prisma.budgetTransaction.create({
              data: {
                budget_id: params.id,
                budget_line_id: body.budgetLineId,
                amount: body.amount,
                transaction_type: body.transactionType,
                reference_type: body.referenceType,
                reference_id: body.referenceId,
                description: body.description,
                created_by: body.createdBy,
              },
              include: {
                budget_line: true,
                creator: { select: { id: true, first_name: true, last_name: true } },
              },
            })

            if (body.budgetLineId) {
              await applyTransactionToLine(body.budgetLineId, body.amount, body.transactionType)
              await syncBudgetTotals(params.id)
            }

            return { transaction }
          },
          { body: createTransactionSchema }
        )
  )
