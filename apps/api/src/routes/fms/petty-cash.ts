import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const TRANSACTION_NUMBER_PREFIX = 'PCT'

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function generateTransactionNumber(): Promise<string> {
  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const count = await prisma.pettyCashTransaction.count({
    where: {
      transaction_number: {
        startsWith: `${TRANSACTION_NUMBER_PREFIX}-${yyyymm}-`,
      },
    },
  })
  const seq = String(count + 1).padStart(4, '0')
  return `${TRANSACTION_NUMBER_PREFIX}-${yyyymm}-${seq}`
}

const createFundSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  fundName: t.String({ minLength: 1 }),
  totalAmount: t.Number({ minimum: 0 }),
  custodianId: t.Optional(t.String()),
})

const updateFundSchema = t.Object({
  fundName: t.Optional(t.String({ minLength: 1 })),
  totalAmount: t.Optional(t.Number({ minimum: 0 })),
  custodianId: t.Optional(t.String()),
})

const createTransactionSchema = t.Object({
  fundId: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  amount: t.Number({ minimum: 0.01 }),
  description: t.String({ minLength: 1 }),
  category: t.Optional(t.String()),
  receiptUrl: t.Optional(t.String()),
  requestedBy: t.String({ minLength: 1 }),
  transactionDate: t.String({ minLength: 1 }),
  siteId: t.Optional(t.String()),
  budgetCode: t.Optional(t.String()),
  responsiblePersonId: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const fmsPettyCashRoutes = new Elysia({ prefix: '/api/fms/petty-cash' })
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
        // ── Funds ──────────────────────────────────────────────────────────────
        .get(
          '/funds',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId

            const [total, funds] = await Promise.all([
              prisma.pettyCashFund.count({ where }),
              prisma.pettyCashFund.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  _count: { select: { transactions: true } },
                },
              }),
            ])

            return { data: funds, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/funds',
          async ({ body, set }) => {
            const fund = await prisma.pettyCashFund.create({
              data: {
                project_id: body.projectId,
                fund_name: body.fundName,
                total_amount: body.totalAmount,
                current_balance: body.totalAmount,
                custodian_id: body.custodianId ?? null,
              },
            })
            set.status = 201
            return { fund }
          },
          { body: createFundSchema }
        )
        .get('/funds/:id', async ({ params, set }) => {
          const fund = await prisma.pettyCashFund.findUnique({
            where: { id: params.id },
            include: {
              transactions: {
                orderBy: { transaction_date: 'desc' },
                include: {
                  requester: {
                    select: { id: true, first_name: true, last_name: true },
                  },
                  approver: {
                    select: { id: true, first_name: true, last_name: true },
                  },
                },
              },
              custodian: {
                select: { id: true, first_name: true, last_name: true },
              },
            },
          })
          if (!fund) {
            set.status = 404
            return { error: 'Fund not found' }
          }
          return { fund }
        })
        .put(
          '/funds/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.pettyCashFund.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Fund not found' }
            }

            const fund = await prisma.pettyCashFund.update({
              where: { id: params.id },
              data: {
                fund_name: body.fundName,
                total_amount: body.totalAmount,
                custodian_id: body.custodianId,
              },
            })
            return { fund }
          },
          { body: updateFundSchema }
        )
        // ── Transactions ───────────────────────────────────────────────────────
        .get(
          '/transactions',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.fundId) where.fund_id = query.fundId
            if (query.status && query.status !== 'all') where.status = query.status

            const [total, transactions] = await Promise.all([
              prisma.pettyCashTransaction.count({ where }),
              prisma.pettyCashTransaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { transaction_date: 'desc' },
                include: {
                  fund: { select: { id: true, fund_name: true } },
                  requester: {
                    select: { id: true, first_name: true, last_name: true },
                  },
                  approver: {
                    select: { id: true, first_name: true, last_name: true },
                  },
                },
              }),
            ])

            return { data: transactions, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              fundId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/transactions',
          async ({ body, set }) => {
            const fund = await prisma.pettyCashFund.findUnique({ where: { id: body.fundId } })
            if (!fund) {
              set.status = 404
              return { error: 'Fund not found' }
            }

            const transaction_number = await generateTransactionNumber()

            const transaction = await prisma.pettyCashTransaction.create({
              data: {
                transaction_number,
                fund_id: body.fundId,
                project_id: body.projectId,
                amount: body.amount,
                description: body.description,
                category: body.category ?? null,
                receipt_url: body.receiptUrl ?? null,
                status: 'PENDING',
                requested_by: body.requestedBy,
                transaction_date: new Date(body.transactionDate),
                site_id: body.siteId ?? null,
                budget_code: body.budgetCode ?? null,
                responsible_person_id: body.responsiblePersonId ?? null,
                notes: body.notes ?? null,
              },
              include: {
                fund: { select: { id: true, fund_name: true } },
                requester: { select: { id: true, first_name: true, last_name: true } },
                approver: { select: { id: true, first_name: true, last_name: true } },
              },
            })
            set.status = 201
            return { transaction }
          },
          { body: createTransactionSchema }
        )
        .post(
          '/transactions/:id/approve',
          async ({ params, body, set }) => {
            const transaction = await prisma.pettyCashTransaction.findUnique({
              where: { id: params.id },
            })
            if (!transaction) {
              set.status = 404
              return { error: 'Transaction not found' }
            }
            if (transaction.status !== 'PENDING') {
              set.status = 409
              return { error: 'Only PENDING transactions can be approved' }
            }

            const fund = await prisma.pettyCashFund.findUnique({
              where: { id: transaction.fund_id },
            })
            if (!fund) {
              set.status = 404
              return { error: 'Fund not found' }
            }
            if (fund.current_balance < transaction.amount) {
              set.status = 409
              return { error: 'Insufficient fund balance' }
            }

            const [updated] = await prisma.$transaction([
              prisma.pettyCashTransaction.update({
                where: { id: params.id },
                data: {
                  status: 'APPROVED',
                  approved_by: body.approvedBy,
                },
                include: {
                  fund: { select: { id: true, fund_name: true } },
                  requester: { select: { id: true, first_name: true, last_name: true } },
                  approver: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
              prisma.pettyCashFund.update({
                where: { id: transaction.fund_id },
                data: { current_balance: { decrement: transaction.amount } },
              }),
            ])

            return { transaction: updated }
          },
          {
            body: t.Object({
              approvedBy: t.String({ minLength: 1 }),
            }),
          }
        )
        .post(
          '/transactions/:id/reject',
          async ({ params, body, set }) => {
            const transaction = await prisma.pettyCashTransaction.findUnique({
              where: { id: params.id },
            })
            if (!transaction) {
              set.status = 404
              return { error: 'Transaction not found' }
            }
            if (transaction.status !== 'PENDING') {
              set.status = 409
              return { error: 'Only PENDING transactions can be rejected' }
            }

            const updated = await prisma.pettyCashTransaction.update({
              where: { id: params.id },
              data: {
                status: 'REJECTED',
                approved_by: body.rejectedBy,
                notes: body.reason ?? transaction.notes,
              },
              include: {
                fund: { select: { id: true, fund_name: true } },
                requester: { select: { id: true, first_name: true, last_name: true } },
                approver: { select: { id: true, first_name: true, last_name: true } },
              },
            })

            return { transaction: updated }
          },
          {
            body: t.Object({
              rejectedBy: t.String({ minLength: 1 }),
              reason: t.Optional(t.String()),
            }),
          }
        )
  )
