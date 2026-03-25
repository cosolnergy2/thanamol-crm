import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateBudgetCode(fiscalYear: number): Promise<string> {
  const prefix = `BDG-${fiscalYear}-`
  const count = await prisma.budget.count({
    where: { budget_code: { startsWith: prefix } },
  })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const budgetInclude = {
  project: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
  lines: true,
}

const budgetLineInputSchema = t.Object({
  category: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  approved_amount: t.Number({ minimum: 0 }),
  notes: t.Optional(t.String()),
})

const createBudgetSchema = t.Object({
  title: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  fiscalYear: t.Number({ minimum: 2000, maximum: 2100 }),
  periodStart: t.String(),
  periodEnd: t.String(),
  totalApproved: t.Number({ minimum: 0 }),
  notes: t.Optional(t.String()),
  createdBy: t.String({ minLength: 1 }),
  lines: t.Optional(t.Array(budgetLineInputSchema)),
})

const updateBudgetSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  periodStart: t.Optional(t.String()),
  periodEnd: t.Optional(t.String()),
  totalApproved: t.Optional(t.Number({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

export const fmsBudgetsRoutes = new Elysia({ prefix: '/api/fms' })
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
          '/budgets',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.fiscalYear) where.fiscal_year = Number(query.fiscalYear)
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { budget_code: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, data] = await Promise.all([
              prisma.budget.count({ where }),
              prisma.budget.findMany({
                where,
                include: budgetInclude,
                skip,
                take: limit,
                orderBy: [{ fiscal_year: 'desc' }, { created_at: 'desc' }],
              }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              fiscalYear: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/budgets/:id', async ({ params, set }) => {
          const budget = await prisma.budget.findUnique({
            where: { id: params.id },
            include: {
              ...budgetInclude,
              transactions: {
                include: {
                  budget_line: true,
                  creator: { select: { id: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
                take: 50,
              },
            },
          })
          if (!budget) {
            set.status = 404
            return { error: 'Budget not found' }
          }
          return { budget }
        })
        .post(
          '/budgets',
          async ({ body }) => {
            const budgetCode = await generateBudgetCode(body.fiscalYear)

            const budget = await prisma.budget.create({
              data: {
                budget_code: budgetCode,
                title: body.title,
                project_id: body.projectId,
                fiscal_year: body.fiscalYear,
                period_start: new Date(body.periodStart),
                period_end: new Date(body.periodEnd),
                total_approved: body.totalApproved,
                notes: body.notes,
                created_by: body.createdBy,
                lines: body.lines
                  ? {
                      create: body.lines.map((l) => ({
                        category: l.category,
                        description: l.description,
                        approved_amount: l.approved_amount,
                        notes: l.notes,
                      })),
                    }
                  : undefined,
              },
              include: budgetInclude,
            })

            return { budget }
          },
          { body: createBudgetSchema }
        )
        .put(
          '/budgets/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.budget.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Budget not found' }
            }
            if (existing.status === 'CLOSED') {
              set.status = 400
              return { error: 'Cannot update a closed budget' }
            }

            const budget = await prisma.budget.update({
              where: { id: params.id },
              data: {
                title: body.title,
                period_start: body.periodStart ? new Date(body.periodStart) : undefined,
                period_end: body.periodEnd ? new Date(body.periodEnd) : undefined,
                total_approved: body.totalApproved,
                notes: body.notes,
              },
              include: budgetInclude,
            })

            return { budget }
          },
          { body: updateBudgetSchema }
        )
        .post(
          '/budgets/:id/approve',
          async ({ params, body, set }) => {
            const existing = await prisma.budget.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Budget not found' }
            }
            if (existing.status !== 'DRAFT') {
              set.status = 400
              return { error: 'Only DRAFT budgets can be approved' }
            }

            const budget = await prisma.budget.update({
              where: { id: params.id },
              data: {
                status: 'APPROVED',
                approved_by: body.approvedBy ?? null,
              },
              include: budgetInclude,
            })

            return { budget }
          },
          { body: t.Object({ approvedBy: t.Optional(t.String()) }) }
        )
        .post('/budgets/:id/activate', async ({ params, set }) => {
          const existing = await prisma.budget.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Budget not found' }
          }
          if (existing.status !== 'APPROVED') {
            set.status = 400
            return { error: 'Only APPROVED budgets can be activated' }
          }

          const budget = await prisma.budget.update({
            where: { id: params.id },
            data: { status: 'ACTIVE' },
            include: budgetInclude,
          })

          return { budget }
        })
        .post('/budgets/:id/close', async ({ params, set }) => {
          const existing = await prisma.budget.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Budget not found' }
          }
          if (existing.status !== 'ACTIVE') {
            set.status = 400
            return { error: 'Only ACTIVE budgets can be closed' }
          }

          const budget = await prisma.budget.update({
            where: { id: params.id },
            data: { status: 'CLOSED' },
            include: budgetInclude,
          })

          return { budget }
        })
  )
