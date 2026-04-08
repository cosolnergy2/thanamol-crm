import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateReconNumber(): Promise<string> {
  const prefix = 'REC-'
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const fullPrefix = `${prefix}${yearMonth}-`
  const count = await prisma.bankReconciliation.count({
    where: { reconciliation_number: { startsWith: fullPrefix } },
  })
  return `${fullPrefix}${String(count + 1).padStart(4, '0')}`
}

const reconItemSchema = t.Object({
  description: t.String({ minLength: 1 }),
  amount: t.Number(),
  itemType: t.String({ minLength: 1 }),
  isBankSide: t.Boolean(),
})

export const financeBankReconciliationsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/bank-reconciliations',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.bankAccountId) where.bank_account_id = query.bankAccountId
            if (query.status && query.status !== 'all') where.status = query.status

            const [total, data] = await Promise.all([
              prisma.bankReconciliation.count({ where }),
              prisma.bankReconciliation.findMany({
                where, skip, take: limit,
                include: {
                  bank_account: { select: { id: true, account_name: true, account_number: true, bank_name: true } },
                  reconciler: { select: { id: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
              }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()), limit: t.Optional(t.String()),
              bankAccountId: t.Optional(t.String()), status: t.Optional(t.String()),
            }),
          }
        )
        .get('/bank-reconciliations/:id', async ({ params, set }) => {
          const recon = await prisma.bankReconciliation.findUnique({
            where: { id: params.id },
            include: {
              bank_account: { select: { id: true, account_name: true, account_number: true, bank_name: true } },
              reconciler: { select: { id: true, first_name: true, last_name: true } },
              items: true,
            },
          })
          if (!recon) { set.status = 404; return { error: 'Reconciliation not found' } }
          return { reconciliation: recon }
        })
        .post(
          '/bank-reconciliations',
          async ({ body, authUser }) => {
            const reconNumber = await generateReconNumber()
            const difference = Number(body.bankStatementBalance) - Number(body.bookBalance)

            const recon = await prisma.bankReconciliation.create({
              data: {
                reconciliation_number: reconNumber,
                bank_account_id: body.bankAccountId,
                reconciliation_month: body.reconciliationMonth,
                bank_statement_balance: body.bankStatementBalance,
                book_balance: body.bookBalance,
                difference: Math.abs(difference),
                status: Math.abs(difference) < 0.01 ? 'BALANCED' : 'IN_PROGRESS',
                reconciled_by: authUser!.id,
                notes: body.notes,
                items: body.items ? {
                  create: body.items.map((item: any) => ({
                    description: item.description,
                    amount: item.amount,
                    item_type: item.itemType,
                    is_bank_side: item.isBankSide,
                  })),
                } : undefined,
              },
              include: {
                bank_account: { select: { id: true, account_name: true, account_number: true, bank_name: true } },
                items: true,
              },
            })
            return { reconciliation: recon }
          },
          {
            body: t.Object({
              bankAccountId: t.String({ minLength: 1 }),
              reconciliationMonth: t.String({ minLength: 1 }),
              bankStatementBalance: t.Number(),
              bookBalance: t.Number(),
              notes: t.Optional(t.String()),
              items: t.Optional(t.Array(reconItemSchema)),
            }),
          }
        )
        .post('/bank-reconciliations/:id/finalize', async ({ params, authUser, set }) => {
          const existing = await prisma.bankReconciliation.findUnique({
            where: { id: params.id },
            include: { items: true },
          })
          if (!existing) { set.status = 404; return { error: 'Reconciliation not found' } }
          if (existing.status === 'BALANCED') { set.status = 400; return { error: 'Already balanced' } }

          const bankAdj = existing.items.filter(i => i.is_bank_side).reduce((s, i) => s + Number(i.amount), 0)
          const bookAdj = existing.items.filter(i => !i.is_bank_side).reduce((s, i) => s + Number(i.amount), 0)
          const adjBankBal = Number(existing.bank_statement_balance) + bankAdj
          const adjBookBal = Number(existing.book_balance) + bookAdj
          const diff = Math.abs(adjBankBal - adjBookBal)

          const recon = await prisma.bankReconciliation.update({
            where: { id: params.id },
            data: {
              adjusted_bank_balance: adjBankBal,
              adjusted_book_balance: adjBookBal,
              difference: diff,
              status: diff < 0.01 ? 'BALANCED' : 'UNBALANCED',
              reconciled_by: authUser!.id,
              reconciled_at: new Date(),
            },
            include: {
              bank_account: { select: { id: true, account_name: true, account_number: true, bank_name: true } },
              items: true,
            },
          })
          return { reconciliation: recon }
        })
  )
