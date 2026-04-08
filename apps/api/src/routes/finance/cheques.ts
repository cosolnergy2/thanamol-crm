import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const financeChequesRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/cheques',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.chequeType && query.chequeType !== 'all') where.cheque_type = query.chequeType
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.bankAccountId) where.bank_account_id = query.bankAccountId
            if (query.search) {
              where.OR = [
                { cheque_number: { contains: query.search, mode: 'insensitive' } },
                { payee_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }
            const [total, data] = await Promise.all([
              prisma.chequeRegister.count({ where }),
              prisma.chequeRegister.findMany({
                where, skip, take: limit,
                include: { bank_account: { select: { id: true, account_name: true, bank_name: true } } },
                orderBy: { cheque_date: 'desc' },
              }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()), limit: t.Optional(t.String()),
              chequeType: t.Optional(t.String()), status: t.Optional(t.String()),
              bankAccountId: t.Optional(t.String()), search: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/cheques',
          async ({ body }) => {
            const cheque = await prisma.chequeRegister.create({
              data: {
                cheque_number: body.chequeNumber,
                cheque_type: body.chequeType as any,
                cheque_date: new Date(body.chequeDate),
                bank_account_id: body.bankAccountId,
                amount: body.amount,
                payee_name: body.payeeName,
                reference_document: body.referenceDocument,
                notes: body.notes,
              },
            })
            return { cheque }
          },
          {
            body: t.Object({
              chequeNumber: t.String({ minLength: 1 }),
              chequeType: t.String({ minLength: 1 }),
              chequeDate: t.String({ minLength: 1 }),
              bankAccountId: t.String({ minLength: 1 }),
              amount: t.Number({ minimum: 0 }),
              payeeName: t.String({ minLength: 1 }),
              referenceDocument: t.Optional(t.String()),
              notes: t.Optional(t.String()),
            }),
          }
        )
        .patch(
          '/cheques/:id/status',
          async ({ params, body, set }) => {
            const existing = await prisma.chequeRegister.findUnique({ where: { id: params.id } })
            if (!existing) { set.status = 404; return { error: 'Cheque not found' } }

            const data: Record<string, unknown> = { status: body.status }
            if (body.status === 'CLEARED') data.cleared_date = new Date()
            if (body.status === 'BOUNCED') data.bounced_date = new Date()

            const cheque = await prisma.chequeRegister.update({ where: { id: params.id }, data })
            return { cheque }
          },
          { body: t.Object({ status: t.String({ minLength: 1 }) }) }
        )
  )
