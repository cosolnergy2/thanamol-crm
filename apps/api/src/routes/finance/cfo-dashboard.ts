import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

export const financeCFODashboardRoutes = new Elysia({ prefix: '/api/finance' })
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
        .get('/cfo-dashboard', async () => {
          const balanceAgg = await prisma.journalEntryLine.groupBy({
            by: ['account_code'],
            _sum: { debit: true, credit: true },
            where: { journal_entry: { status: 'POSTED' } },
          })

          const accounts = await prisma.chartOfAccount.findMany({
            where: { is_active: true },
            select: { account_code: true, account_type: true },
          })

          const typeMap = new Map(accounts.map(a => [a.account_code, a.account_type]))

          let totalAssets = 0, totalLiabilities = 0, totalEquity = 0
          let totalRevenue = 0, totalExpenses = 0, cashBalance = 0

          for (const agg of balanceAgg) {
            const type = typeMap.get(agg.account_code)
            const dr = Number(agg._sum.debit ?? 0)
            const cr = Number(agg._sum.credit ?? 0)
            switch (type) {
              case 'ASSET': totalAssets += dr - cr; break
              case 'LIABILITY': totalLiabilities += cr - dr; break
              case 'EQUITY': totalEquity += cr - dr; break
              case 'REVENUE': case 'OTHER_INCOME': totalRevenue += cr - dr; break
              case 'COST_OF_SALES': case 'OPERATING_EXPENSE': case 'OTHER_EXPENSE': totalExpenses += dr - cr; break
            }
          }

          // Cash balance from bank accounts
          const bankAgg = await prisma.bankAccount.aggregate({
            _sum: { current_balance: true },
            where: { is_active: true },
          })
          cashBalance = Number(bankAgg._sum.current_balance ?? 0)

          // AP/AR balances
          const arAgg = await prisma.invoice.aggregate({
            _sum: { total: true },
            where: { status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] } },
          })
          const apAgg = await prisma.aPInvoice.aggregate({
            _sum: { total_amount: true },
            where: { status: { in: ['AP_APPROVED', 'AP_PARTIALLY_PAID'] } },
          })

          const netIncome = totalRevenue - totalExpenses
          const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0
          const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

          // Revenue trend (last 6 months)
          const now = new Date()
          const revenueTrend: Array<{ period: string; revenue: number; expenses: number }> = []
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

            const periodAgg = await prisma.journalEntryLine.groupBy({
              by: ['account_code'],
              _sum: { debit: true, credit: true },
              where: { journal_entry: { status: 'POSTED', posting_period: period } },
            })

            let rev = 0, exp = 0
            for (const a of periodAgg) {
              const t = typeMap.get(a.account_code)
              if (t === 'REVENUE' || t === 'OTHER_INCOME') rev += Number(a._sum.credit ?? 0) - Number(a._sum.debit ?? 0)
              if (t === 'COST_OF_SALES' || t === 'OPERATING_EXPENSE' || t === 'OTHER_EXPENSE') exp += Number(a._sum.debit ?? 0) - Number(a._sum.credit ?? 0)
            }
            revenueTrend.push({ period, revenue: rev, expenses: exp })
          }

          return {
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_equity: totalEquity,
            net_income: netIncome,
            cash_balance: cashBalance,
            ar_balance: Number(arAgg._sum?.total ?? 0),
            ap_balance: Number(apAgg._sum.total_amount ?? 0),
            current_ratio: Math.round(currentRatio * 100) / 100,
            gross_margin: Math.round(grossMargin * 100) / 100,
            revenue_trend: revenueTrend,
          }
        })
        .get(
          '/cash-flow/analysis',
          async ({ query }) => {
            const dateFrom = query.dateFrom ?? `${new Date().getFullYear()}-01-01`
            const dateTo = query.dateTo ?? new Date().toISOString().slice(0, 10)
            const periodFrom = dateFrom.slice(0, 7)
            const periodTo = dateTo.slice(0, 7)

            const accounts = await prisma.chartOfAccount.findMany({
              where: { is_active: true },
              select: { account_code: true, cash_flow_category: true },
            })

            const categoryMap = new Map(accounts.map(a => [a.account_code, a.cash_flow_category]))

            const lines = await prisma.journalEntryLine.findMany({
              where: {
                journal_entry: { status: 'POSTED', posting_period: { gte: periodFrom, lte: periodTo } },
              },
              select: { account_code: true, debit: true, credit: true },
            })

            let operating = 0, investing = 0, financing = 0

            for (const line of lines) {
              const category = categoryMap.get(line.account_code)
              const net = Number(line.debit) - Number(line.credit)
              switch (category) {
                case 'OPERATING': operating += net; break
                case 'INVESTING': investing += net; break
                case 'FINANCING': financing += net; break
              }
            }

            return {
              operating,
              investing,
              financing,
              net_change: operating + investing + financing,
              date_from: dateFrom,
              date_to: dateTo,
            }
          },
          {
            query: t.Object({
              dateFrom: t.Optional(t.String()),
              dateTo: t.Optional(t.String()),
            }),
          }
        )
  )
