import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

async function buildMaintenanceCostReport(projectId: string, startDate?: string, endDate?: string) {
  const where: Record<string, unknown> = { project_id: projectId }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    where.created_at = dateFilter
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    select: { actual_cost: true, created_at: true },
    orderBy: { created_at: 'asc' },
  })

  const monthMap = new Map<string, { totalCost: number; workOrderCount: number }>()

  for (const wo of workOrders) {
    const d = wo.created_at
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthMap.get(key) ?? { totalCost: 0, workOrderCount: 0 }
    monthMap.set(key, {
      totalCost: existing.totalCost + (wo.actual_cost ?? 0),
      workOrderCount: existing.workOrderCount + 1,
    })
  }

  const rows = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))

  const totalCost = rows.reduce((sum, r) => sum + r.totalCost, 0)

  return { rows, totalCost }
}

async function buildAssetStatusReport(projectId: string) {
  const groups = await prisma.asset.groupBy({
    by: ['status'],
    where: { project_id: projectId },
    _count: { status: true },
  })

  const rows = groups.map((g) => ({ status: g.status, count: g._count.status }))
  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return { rows, total }
}

async function buildBudgetVarianceReport(projectId: string, fiscalYear?: number) {
  const where: Record<string, unknown> = { project_id: projectId }
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: { lines: true },
  })

  const rows = budgets.flatMap((budget) =>
    budget.lines.map((line) => ({
      id: line.id,
      category: line.category,
      description: line.description,
      approvedAmount: line.approved_amount,
      committedAmount: line.committed_amount,
      actualAmount: line.actual_amount,
      variance: line.approved_amount - line.actual_amount,
    }))
  )

  const totalApproved = rows.reduce((sum, r) => sum + r.approvedAmount, 0)
  const totalActual = rows.reduce((sum, r) => sum + r.actualAmount, 0)
  const totalVariance = totalApproved - totalActual

  return { rows, totalApproved, totalActual, totalVariance }
}

async function buildComplianceStatusReport(projectId: string) {
  const now = new Date()
  const in30Days = new Date(now.getTime() + THIRTY_DAYS_MS)

  const projectFilter = { project_id: projectId }

  const [fireEquipmentOverdue, activePermitsToWork, incidentGroups, expiringInsurance] =
    await Promise.all([
      prisma.fireEquipment.count({
        where: {
          ...projectFilter,
          status: 'ACTIVE',
          next_inspection_date: { lt: now },
        },
      }),

      prisma.permitToWork.count({
        where: {
          ...projectFilter,
          status: 'APPROVED',
          end_date: { gte: now },
        },
      }),

      prisma.incident.groupBy({
        by: ['severity'],
        where: {
          ...projectFilter,
          status: { in: ['REPORTED', 'INVESTIGATING'] },
        },
        _count: { severity: true },
      }),

      prisma.insurancePolicy.findMany({
        where: {
          project_id: projectId,
          status: 'ACTIVE',
          end_date: { gte: now, lte: in30Days },
        },
        select: {
          id: true,
          policy_number: true,
          provider: true,
          type: true,
          end_date: true,
        },
        orderBy: { end_date: 'asc' },
      }),
    ])

  const openIncidentsBySeverity = incidentGroups.map((g) => ({
    severity: g.severity,
    count: g._count.severity,
  }))

  return {
    fireEquipmentOverdue,
    activePermitsToWork,
    openIncidentsBySeverity,
    expiringInsurance: expiringInsurance.map((p) => ({
      ...p,
      end_date: p.end_date.toISOString(),
    })),
  }
}

async function buildBudgetOverviewReport(fiscalYear?: number) {
  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: { lines: true },
  })

  const totalBudgets = budgets.length
  const totalApprovedAmount = budgets.reduce((sum, b) => sum + b.total_approved, 0)
  const totalSpent = budgets.reduce(
    (sum, b) => sum + b.lines.reduce((ls, l) => ls + l.actual_amount, 0),
    0
  )
  const totalRemaining = totalApprovedAmount - totalSpent

  const byStatus: Record<string, number> = {}
  for (const b of budgets) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1
  }

  return { totalBudgets, totalApprovedAmount, totalSpent, totalRemaining, byStatus }
}

async function buildBudgetVsActualReport(fiscalYear?: number) {
  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: { lines: true, project: { select: { name: true } } },
  })

  const rows = budgets.map((b) => {
    const totalApproved = b.lines.reduce((s, l) => s + l.approved_amount, 0)
    const totalActual = b.lines.reduce((s, l) => s + l.actual_amount, 0)
    const totalCommitted = b.lines.reduce((s, l) => s + l.committed_amount, 0)
    const variance = totalApproved - totalActual
    const utilizationPct =
      totalApproved > 0 ? Math.round((totalActual / totalApproved) * 1000) / 10 : 0
    return {
      id: b.id,
      budgetCode: b.budget_code,
      title: b.title,
      fiscalYear: b.fiscal_year,
      status: b.status,
      project: b.project?.name ?? null,
      totalApproved,
      totalActual,
      totalCommitted,
      variance,
      utilizationPct,
    }
  })

  const totals = {
    totalApproved: rows.reduce((s, r) => s + r.totalApproved, 0),
    totalActual: rows.reduce((s, r) => s + r.totalActual, 0),
    totalVariance: rows.reduce((s, r) => s + r.variance, 0),
  }

  return { rows, totals }
}

async function buildVendorSummaryReport() {
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      vendor_code: true,
      name: true,
      status: true,
      contracts: {
        where: { status: 'ACTIVE' },
        select: { id: true },
      },
      invoices: {
        select: { id: true, total: true, payment_status: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = vendors.map((vendor) => {
    const totalSpend = vendor.invoices.reduce((sum, inv) => sum + inv.total, 0)
    const invoiceStatusSummary = vendor.invoices.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.payment_status] = (acc[inv.payment_status] ?? 0) + 1
      return acc
    }, {})

    return {
      vendorId: vendor.id,
      vendorCode: vendor.vendor_code,
      vendorName: vendor.name,
      status: vendor.status,
      activeContractsCount: vendor.contracts.length,
      totalInvoices: vendor.invoices.length,
      totalSpend,
      invoiceStatusSummary,
    }
  })

  const totals = {
    totalVendors: rows.length,
    activeVendors: rows.filter((r) => r.status === 'ACTIVE').length,
    totalActiveContracts: rows.reduce((sum, r) => sum + r.activeContractsCount, 0),
    totalSpend: rows.reduce((sum, r) => sum + r.totalSpend, 0),
  }

  return { rows, totals }
}

async function buildCostReport(fiscalYear?: number) {
  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: { lines: true },
  })

  const categoryMap = new Map<string, { approved: number; actual: number; committed: number }>()

  for (const b of budgets) {
    for (const line of b.lines) {
      const cat = line.category
      const existing = categoryMap.get(cat) ?? { approved: 0, actual: 0, committed: 0 }
      categoryMap.set(cat, {
        approved: existing.approved + line.approved_amount,
        actual: existing.actual + line.actual_amount,
        committed: existing.committed + line.committed_amount,
      })
    }
  }

  const rows = Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, data]) => ({ category, ...data }))

  const totalActual = rows.reduce((s, r) => s + r.actual, 0)

  return { rows, totalActual }
}

export const fmsReportsRoutes = new Elysia({ prefix: '/api/fms/reports' })
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
          '/maintenance-cost',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildMaintenanceCostReport(
              query.projectId,
              query.startDate || undefined,
              query.endDate || undefined
            )
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              startDate: t.Optional(t.String()),
              endDate: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/asset-status',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildAssetStatusReport(query.projectId)
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/budget-variance',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildBudgetVarianceReport(
              query.projectId,
              query.fiscalYear ? Number(query.fiscalYear) : undefined
            )
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              fiscalYear: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/compliance-status',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildComplianceStatusReport(query.projectId)
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/budget-overview',
          async ({ query }) => {
            const report = await buildBudgetOverviewReport(
              query.fiscalYear ? Number(query.fiscalYear) : undefined
            )
            return { report }
          },
          {
            query: t.Object({
              fiscalYear: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/budget-vs-actual',
          async ({ query }) => {
            const report = await buildBudgetVsActualReport(
              query.fiscalYear ? Number(query.fiscalYear) : undefined
            )
            return { report }
          },
          {
            query: t.Object({
              fiscalYear: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/cost-report',
          async ({ query }) => {
            const report = await buildCostReport(
              query.fiscalYear ? Number(query.fiscalYear) : undefined
            )
            return { report }
          },
          {
            query: t.Object({
              fiscalYear: t.Optional(t.String()),
            }),
          }
        )
        .get('/vendor-summary', async () => {
          const report = await buildVendorSummaryReport()
          return { report }
        })
  )
