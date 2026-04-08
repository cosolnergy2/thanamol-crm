import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const accountInclude = {
  children: {
    select: { id: true, account_code: true, account_name_th: true, account_name_en: true, account_type: true, level: true, is_active: true },
    orderBy: { account_code: 'asc' as const },
  },
}

const createAccountSchema = t.Object({
  accountCode: t.String({ minLength: 1 }),
  accountNameTh: t.String({ minLength: 1 }),
  accountNameEn: t.Optional(t.String()),
  accountType: t.String({ minLength: 1 }),
  level: t.Optional(t.Number({ minimum: 1, maximum: 3 })),
  parentAccountCode: t.Optional(t.String()),
  normalBalance: t.Optional(t.String()),
  cashFlowCategory: t.Optional(t.String()),
  vatType: t.Optional(t.String()),
  taxApplicable: t.Optional(t.Boolean()),
  isSubledger: t.Optional(t.Boolean()),
  isActive: t.Optional(t.Boolean()),
  reportingGroup: t.Optional(t.String()),
  description: t.Optional(t.String()),
})

const updateAccountSchema = t.Object({
  accountNameTh: t.Optional(t.String({ minLength: 1 })),
  accountNameEn: t.Optional(t.String()),
  accountType: t.Optional(t.String()),
  level: t.Optional(t.Number({ minimum: 1, maximum: 3 })),
  parentAccountCode: t.Optional(t.Nullable(t.String())),
  normalBalance: t.Optional(t.String()),
  cashFlowCategory: t.Optional(t.String()),
  vatType: t.Optional(t.String()),
  taxApplicable: t.Optional(t.Boolean()),
  isSubledger: t.Optional(t.Boolean()),
  isActive: t.Optional(t.Boolean()),
  reportingGroup: t.Optional(t.Nullable(t.String())),
  description: t.Optional(t.Nullable(t.String())),
})

export const financeChartOfAccountsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/chart-of-accounts',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 50)
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.accountType && query.accountType !== 'all') where.account_type = query.accountType
            if (query.isActive !== undefined) where.is_active = query.isActive === 'true'
            if (query.level) where.level = Number(query.level)
            if (query.search) {
              where.OR = [
                { account_code: { contains: query.search, mode: 'insensitive' } },
                { account_name_th: { contains: query.search, mode: 'insensitive' } },
                { account_name_en: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, data] = await Promise.all([
              prisma.chartOfAccount.count({ where }),
              prisma.chartOfAccount.findMany({
                where,
                skip,
                take: limit,
                orderBy: { account_code: 'asc' },
              }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              accountType: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
              level: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/chart-of-accounts/tree', async () => {
          const accounts = await prisma.chartOfAccount.findMany({
            where: { is_active: true },
            include: accountInclude,
            orderBy: { account_code: 'asc' },
          })
          const roots = accounts.filter((a) => !a.parent_account_code)
          return { data: roots }
        })
        .get('/chart-of-accounts/:id', async ({ params, set }) => {
          const account = await prisma.chartOfAccount.findUnique({
            where: { id: params.id },
            include: accountInclude,
          })
          if (!account) {
            set.status = 404
            return { error: 'Account not found' }
          }
          return { account }
        })
        .post(
          '/chart-of-accounts',
          async ({ body, set }) => {
            const existing = await prisma.chartOfAccount.findUnique({
              where: { account_code: body.accountCode },
            })
            if (existing) {
              set.status = 409
              return { error: `Account code ${body.accountCode} already exists` }
            }

            if (body.parentAccountCode) {
              const parent = await prisma.chartOfAccount.findUnique({
                where: { account_code: body.parentAccountCode },
              })
              if (!parent) {
                set.status = 400
                return { error: `Parent account ${body.parentAccountCode} not found` }
              }
            }

            const account = await prisma.chartOfAccount.create({
              data: {
                account_code: body.accountCode,
                account_name_th: body.accountNameTh,
                account_name_en: body.accountNameEn,
                account_type: body.accountType as any,
                level: body.level ?? 3,
                parent_account_code: body.parentAccountCode ?? null,
                normal_balance: (body.normalBalance as any) ?? 'DEBIT',
                cash_flow_category: (body.cashFlowCategory as any) ?? 'NONE',
                vat_type: body.vatType ?? 'NONE',
                tax_applicable: body.taxApplicable ?? false,
                is_subledger: body.isSubledger ?? false,
                is_active: body.isActive ?? true,
                reporting_group: body.reportingGroup,
                description: body.description,
              },
            })

            return { account }
          },
          { body: createAccountSchema }
        )
        .put(
          '/chart-of-accounts/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.chartOfAccount.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Account not found' }
            }

            const data: Record<string, unknown> = {}
            if (body.accountNameTh !== undefined) data.account_name_th = body.accountNameTh
            if (body.accountNameEn !== undefined) data.account_name_en = body.accountNameEn
            if (body.accountType !== undefined) data.account_type = body.accountType
            if (body.level !== undefined) data.level = body.level
            if (body.parentAccountCode !== undefined) data.parent_account_code = body.parentAccountCode
            if (body.normalBalance !== undefined) data.normal_balance = body.normalBalance
            if (body.cashFlowCategory !== undefined) data.cash_flow_category = body.cashFlowCategory
            if (body.vatType !== undefined) data.vat_type = body.vatType
            if (body.taxApplicable !== undefined) data.tax_applicable = body.taxApplicable
            if (body.isSubledger !== undefined) data.is_subledger = body.isSubledger
            if (body.isActive !== undefined) data.is_active = body.isActive
            if (body.reportingGroup !== undefined) data.reporting_group = body.reportingGroup
            if (body.description !== undefined) data.description = body.description

            const account = await prisma.chartOfAccount.update({
              where: { id: params.id },
              data,
            })

            return { account }
          },
          { body: updateAccountSchema }
        )
        .delete('/chart-of-accounts/:id', async ({ params, set }) => {
          const existing = await prisma.chartOfAccount.findUnique({
            where: { id: params.id },
            include: { journal_lines: { take: 1 }, children: { take: 1 } },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Account not found' }
          }
          if (existing.journal_lines.length > 0) {
            set.status = 400
            return { error: 'Cannot delete account with journal entries. Deactivate instead.' }
          }
          if (existing.children.length > 0) {
            set.status = 400
            return { error: 'Cannot delete account with child accounts' }
          }

          await prisma.chartOfAccount.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
