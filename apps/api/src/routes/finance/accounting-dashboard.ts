import { Elysia } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

export const financeAccountingDashboardRoutes = new Elysia({ prefix: '/api/finance' })
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
      app.get('/accounting-dashboard', async () => {
        const currentPeriod = new Date().toISOString().slice(0, 7)

        const balanceAgg = await prisma.journalEntryLine.groupBy({
          by: ['account_code'],
          _sum: { debit: true, credit: true },
          where: { journal_entry: { status: 'POSTED' } },
        })

        const accounts = await prisma.chartOfAccount.findMany({
          where: { is_active: true },
          select: { account_code: true, account_type: true },
        })

        const accountTypeMap = new Map(accounts.map((a) => [a.account_code, a.account_type]))

        let totalAssets = 0
        let totalLiabilities = 0
        let totalEquity = 0
        let totalRevenue = 0
        let totalExpenses = 0

        for (const agg of balanceAgg) {
          const type = accountTypeMap.get(agg.account_code)
          const debit = Number(agg._sum.debit ?? 0)
          const credit = Number(agg._sum.credit ?? 0)

          switch (type) {
            case 'ASSET':
              totalAssets += debit - credit
              break
            case 'LIABILITY':
              totalLiabilities += credit - debit
              break
            case 'EQUITY':
              totalEquity += credit - debit
              break
            case 'REVENUE':
            case 'OTHER_INCOME':
              totalRevenue += credit - debit
              break
            case 'COST_OF_SALES':
            case 'OPERATING_EXPENSE':
            case 'OTHER_EXPENSE':
              totalExpenses += debit - credit
              break
          }
        }

        const [unpostedJournals, openPeriods, recentJournals] = await Promise.all([
          prisma.journalEntry.count({ where: { status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } } }),
          prisma.accountingPeriod.count({ where: { status: 'OPEN' } }),
          prisma.journalEntry.findMany({
            orderBy: { created_at: 'desc' },
            take: 10,
            include: {
              preparer: { select: { id: true, first_name: true, last_name: true } },
            },
          }),
        ])

        return {
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          total_equity: totalEquity,
          net_income: totalRevenue - totalExpenses,
          unposted_journals: unpostedJournals,
          open_periods: openPeriods,
          recent_journals: recentJournals,
        }
      })
  )
