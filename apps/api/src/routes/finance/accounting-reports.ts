import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

export const financeAccountingReportsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/reports/trial-balance',
          async ({ query }) => {
            const periodFrom = query.periodFrom ?? `${new Date().getFullYear()}-01`
            const periodTo = query.periodTo ?? new Date().toISOString().slice(0, 7)

            const accounts = await prisma.chartOfAccount.findMany({
              where: { is_active: true },
              orderBy: { account_code: 'asc' },
            })

            const openingAgg = await prisma.journalEntryLine.groupBy({
              by: ['account_code'],
              _sum: { debit: true, credit: true },
              where: {
                journal_entry: { status: 'POSTED', posting_period: { lt: periodFrom } },
              },
            })

            const periodAgg = await prisma.journalEntryLine.groupBy({
              by: ['account_code'],
              _sum: { debit: true, credit: true },
              where: {
                journal_entry: { status: 'POSTED', posting_period: { gte: periodFrom, lte: periodTo } },
              },
            })

            const openingMap = new Map(openingAgg.map((a) => [a.account_code, a._sum]))
            const periodMap = new Map(periodAgg.map((a) => [a.account_code, a._sum]))

            const rows = accounts.map((acc) => {
              const opening = openingMap.get(acc.account_code)
              const period = periodMap.get(acc.account_code)

              const od = Number(opening?.debit ?? 0)
              const oc = Number(opening?.credit ?? 0)
              const pd = Number(period?.debit ?? 0)
              const pc = Number(period?.credit ?? 0)

              return {
                account_code: acc.account_code,
                account_name_th: acc.account_name_th,
                account_name_en: acc.account_name_en,
                account_type: acc.account_type,
                opening_debit: od,
                opening_credit: oc,
                period_debit: pd,
                period_credit: pc,
                closing_debit: od + pd,
                closing_credit: oc + pc,
              }
            }).filter((r) => r.opening_debit || r.opening_credit || r.period_debit || r.period_credit)

            const totals = rows.reduce(
              (acc, r) => ({
                opening_debit: acc.opening_debit + r.opening_debit,
                opening_credit: acc.opening_credit + r.opening_credit,
                period_debit: acc.period_debit + r.period_debit,
                period_credit: acc.period_credit + r.period_credit,
                closing_debit: acc.closing_debit + r.closing_debit,
                closing_credit: acc.closing_credit + r.closing_credit,
              }),
              { opening_debit: 0, opening_credit: 0, period_debit: 0, period_credit: 0, closing_debit: 0, closing_credit: 0 }
            )

            return { rows, totals, period_from: periodFrom, period_to: periodTo }
          },
          {
            query: t.Object({
              periodFrom: t.Optional(t.String()),
              periodTo: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/reports/balance-sheet',
          async ({ query }) => {
            const asOfDate = query.asOfDate ?? new Date().toISOString().slice(0, 10)
            const asOfPeriod = asOfDate.slice(0, 7)

            const agg = await prisma.journalEntryLine.groupBy({
              by: ['account_code'],
              _sum: { debit: true, credit: true },
              where: {
                journal_entry: { status: 'POSTED', posting_period: { lte: asOfPeriod } },
              },
            })

            const balanceMap = new Map(agg.map((a) => [a.account_code, { debit: Number(a._sum.debit ?? 0), credit: Number(a._sum.credit ?? 0) }]))

            const accounts = await prisma.chartOfAccount.findMany({
              where: { is_active: true, account_type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
              orderBy: { account_code: 'asc' },
            })

            function buildSection(type: string, label: string) {
              const accs = accounts
                .filter((a) => a.account_type === type)
                .map((a) => {
                  const b = balanceMap.get(a.account_code)
                  const balance = type === 'ASSET' ? (b?.debit ?? 0) - (b?.credit ?? 0) : (b?.credit ?? 0) - (b?.debit ?? 0)
                  return { account_code: a.account_code, account_name_th: a.account_name_th, balance }
                })
                .filter((a) => Math.abs(a.balance) > 0.01)

              return { label, accounts: accs, total: accs.reduce((s, a) => s + a.balance, 0) }
            }

            const assets = [buildSection('ASSET', 'Assets')]
            const liabilities = [buildSection('LIABILITY', 'Liabilities')]
            const equity = [buildSection('EQUITY', 'Equity')]

            return {
              assets,
              liabilities,
              equity,
              total_assets: assets.reduce((s, sec) => s + sec.total, 0),
              total_liabilities: liabilities.reduce((s, sec) => s + sec.total, 0),
              total_equity: equity.reduce((s, sec) => s + sec.total, 0),
              as_of_date: asOfDate,
            }
          },
          {
            query: t.Object({
              asOfDate: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/reports/profit-loss',
          async ({ query }) => {
            const dateFrom = query.dateFrom ?? `${new Date().getFullYear()}-01-01`
            const dateTo = query.dateTo ?? new Date().toISOString().slice(0, 10)
            const periodFrom = dateFrom.slice(0, 7)
            const periodTo = dateTo.slice(0, 7)

            const agg = await prisma.journalEntryLine.groupBy({
              by: ['account_code'],
              _sum: { debit: true, credit: true },
              where: {
                journal_entry: { status: 'POSTED', posting_period: { gte: periodFrom, lte: periodTo } },
              },
            })

            const balanceMap = new Map(agg.map((a) => [a.account_code, { debit: Number(a._sum.debit ?? 0), credit: Number(a._sum.credit ?? 0) }]))

            const accounts = await prisma.chartOfAccount.findMany({
              where: {
                is_active: true,
                account_type: { in: ['REVENUE', 'COST_OF_SALES', 'OPERATING_EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE'] },
              },
              orderBy: { account_code: 'asc' },
            })

            function buildPLSection(type: string, label: string, creditNormal: boolean) {
              const accs = accounts
                .filter((a) => a.account_type === type)
                .map((a) => {
                  const b = balanceMap.get(a.account_code)
                  const amount = creditNormal ? (b?.credit ?? 0) - (b?.debit ?? 0) : (b?.debit ?? 0) - (b?.credit ?? 0)
                  return { account_code: a.account_code, account_name_th: a.account_name_th, amount }
                })
                .filter((a) => Math.abs(a.amount) > 0.01)

              return { label, accounts: accs, total: accs.reduce((s, a) => s + a.amount, 0) }
            }

            const revenue = buildPLSection('REVENUE', 'Revenue', true)
            const cost_of_sales = buildPLSection('COST_OF_SALES', 'Cost of Sales', false)
            const gross_profit = revenue.total - cost_of_sales.total
            const operating_expenses = buildPLSection('OPERATING_EXPENSE', 'Operating Expenses', false)
            const operating_income = gross_profit - operating_expenses.total
            const other_income = buildPLSection('OTHER_INCOME', 'Other Income', true)
            const other_expenses = buildPLSection('OTHER_EXPENSE', 'Other Expenses', false)
            const net_income = operating_income + other_income.total - other_expenses.total

            return {
              revenue,
              cost_of_sales,
              gross_profit,
              operating_expenses,
              operating_income,
              other_income,
              other_expenses,
              net_income,
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
        .get(
          '/reports/general-ledger',
          async ({ query, set }) => {
            if (!query.accountCode) {
              set.status = 400
              return { error: 'accountCode is required' }
            }

            const account = await prisma.chartOfAccount.findUnique({
              where: { account_code: query.accountCode },
            })
            if (!account) {
              set.status = 404
              return { error: 'Account not found' }
            }

            const dateFrom = query.dateFrom ?? `${new Date().getFullYear()}-01-01`
            const dateTo = query.dateTo ?? new Date().toISOString().slice(0, 10)

            const openingAgg = await prisma.journalEntryLine.aggregate({
              _sum: { debit: true, credit: true },
              where: {
                account_code: query.accountCode,
                journal_entry: { status: 'POSTED', journal_date: { lt: new Date(dateFrom) } },
              },
            })

            const isDebitNormal = ['ASSET', 'COST_OF_SALES', 'OPERATING_EXPENSE', 'OTHER_EXPENSE'].includes(account.account_type)
            const openingBalance = isDebitNormal
              ? Number(openingAgg._sum.debit ?? 0) - Number(openingAgg._sum.credit ?? 0)
              : Number(openingAgg._sum.credit ?? 0) - Number(openingAgg._sum.debit ?? 0)

            const lines = await prisma.journalEntryLine.findMany({
              where: {
                account_code: query.accountCode,
                journal_entry: {
                  status: 'POSTED',
                  journal_date: { gte: new Date(dateFrom), lte: new Date(dateTo) },
                },
              },
              include: {
                journal_entry: {
                  select: { journal_number: true, journal_date: true, narration: true, reference_document: true },
                },
              },
              orderBy: { journal_entry: { journal_date: 'asc' } },
            })

            let runningBalance = openingBalance
            const entries = lines.map((l) => {
              const debit = Number(l.debit)
              const credit = Number(l.credit)
              runningBalance += isDebitNormal ? debit - credit : credit - debit
              return {
                journal_number: l.journal_entry.journal_number,
                journal_date: l.journal_entry.journal_date.toISOString(),
                narration: l.journal_entry.narration,
                reference_document: l.journal_entry.reference_document,
                debit,
                credit,
                running_balance: runningBalance,
              }
            })

            return {
              account_code: account.account_code,
              account_name_th: account.account_name_th,
              account_name_en: account.account_name_en,
              opening_balance: openingBalance,
              entries,
              closing_balance: runningBalance,
              total_debit: entries.reduce((s, e) => s + e.debit, 0),
              total_credit: entries.reduce((s, e) => s + e.credit, 0),
            }
          },
          {
            query: t.Object({
              accountCode: t.Optional(t.String()),
              dateFrom: t.Optional(t.String()),
              dateTo: t.Optional(t.String()),
            }),
          }
        )
  )
