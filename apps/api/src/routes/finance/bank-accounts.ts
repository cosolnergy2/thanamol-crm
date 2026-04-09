import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const financeBankAccountsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/bank-accounts',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.isActive !== undefined) where.is_active = query.isActive === 'true'
            if (query.search) {
              where.OR = [
                { account_name: { contains: query.search, mode: 'insensitive' } },
                { account_number: { contains: query.search, mode: 'insensitive' } },
                { bank_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }
            const [total, data] = await Promise.all([
              prisma.bankAccount.count({ where }),
              prisma.bankAccount.findMany({ where, skip, take: limit, orderBy: { account_name: 'asc' } }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          { query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), isActive: t.Optional(t.String()), search: t.Optional(t.String()) }) }
        )
        .get('/bank-accounts/:id', async ({ params, set }) => {
          const account = await prisma.bankAccount.findUnique({ where: { id: params.id }, include: { site: { select: { id: true, name: true, code: true } } } })
          if (!account) { set.status = 404; return { error: 'Bank account not found' } }
          return { account }
        })
        .post(
          '/bank-accounts',
          async ({ body, set }) => {
            const existing = await prisma.bankAccount.findUnique({ where: { account_number: body.accountNumber } })
            if (existing) { set.status = 409; return { error: 'Account number already exists' } }
            const account = await prisma.bankAccount.create({
              data: {
                account_name: body.accountName,
                account_number: body.accountNumber,
                bank_name: body.bankName,
                branch_name: body.branchName,
                account_type: (body.accountType as any) ?? 'CURRENT',
                gl_account_code: body.glAccountCode,
                site_id: body.siteId,
                currency: body.currency ?? 'THB',
                opening_balance: body.openingBalance ?? 0,
                current_balance: body.openingBalance ?? 0,
              },
            })
            return { account }
          },
          {
            body: t.Object({
              accountName: t.String({ minLength: 1 }),
              accountNumber: t.String({ minLength: 1 }),
              bankName: t.String({ minLength: 1 }),
              branchName: t.Optional(t.String()),
              accountType: t.Optional(t.String()),
              glAccountCode: t.Optional(t.String()),
              siteId: t.Optional(t.String()),
              currency: t.Optional(t.String()),
              openingBalance: t.Optional(t.Number()),
            }),
          }
        )
        .put(
          '/bank-accounts/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.bankAccount.findUnique({ where: { id: params.id } })
            if (!existing) { set.status = 404; return { error: 'Bank account not found' } }
            const account = await prisma.bankAccount.update({
              where: { id: params.id },
              data: {
                account_name: body.accountName,
                bank_name: body.bankName,
                branch_name: body.branchName,
                account_type: body.accountType as any,
                gl_account_code: body.glAccountCode,
                site_id: body.siteId,
                is_active: body.isActive,
              },
            })
            return { account }
          },
          {
            body: t.Object({
              accountName: t.Optional(t.String()),
              bankName: t.Optional(t.String()),
              branchName: t.Optional(t.Nullable(t.String())),
              accountType: t.Optional(t.String()),
              glAccountCode: t.Optional(t.Nullable(t.String())),
              siteId: t.Optional(t.Nullable(t.String())),
              isActive: t.Optional(t.Boolean()),
            }),
          }
        )
  )
