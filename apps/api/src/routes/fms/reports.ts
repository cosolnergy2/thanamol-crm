import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

async function buildPMComplianceReport(projectId: string) {
  const now = new Date()

  const pms = await prisma.preventiveMaintenance.findMany({
    where: { project_id: projectId, is_active: true },
    select: {
      id: true,
      pm_number: true,
      title: true,
      next_due_date: true,
      last_completed_date: true,
      frequency: true,
    },
  })

  const total = pms.length

  const overdueList: Array<{
    id: string
    pm_number: string
    title: string
    next_due_date: string
    days_overdue: number
  }> = []

  let onTimeCount = 0
  let overdueCount = 0
  let missedCount = 0

  for (const pm of pms) {
    if (!pm.next_due_date) {
      missedCount++
      continue
    }

    const dueDate = new Date(pm.next_due_date)

    if (dueDate > now) {
      onTimeCount++
    } else {
      overdueCount++
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
      overdueList.push({
        id: pm.id,
        pm_number: pm.pm_number,
        title: pm.title,
        next_due_date: pm.next_due_date.toISOString(),
        days_overdue: daysOverdue,
      })
    }
  }

  const compliancePercentage = total > 0 ? Math.round((onTimeCount / total) * 100) : 100

  return {
    total,
    onTimeCount,
    overdueCount,
    missedCount,
    compliancePercentage,
    overdueList: overdueList.sort((a, b) => b.days_overdue - a.days_overdue),
  }
}

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

  const byStatus = budgets.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  return { totalBudgets, totalApprovedAmount, totalSpent, totalRemaining, byStatus }
}

async function buildBudgetVsActualReport(fiscalYear?: number) {
  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: {
      lines: true,
      project: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ fiscal_year: 'desc' }, { created_at: 'desc' }],
  })

  const rows = budgets.map((budget) => {
    const totalApproved = budget.total_approved
    const totalActual = budget.lines.reduce((sum, l) => sum + l.actual_amount, 0)
    const totalCommitted = budget.lines.reduce((sum, l) => sum + l.committed_amount, 0)
    const variance = totalApproved - totalActual
    const utilizationPct = totalApproved > 0 ? (totalActual / totalApproved) * 100 : 0

    return {
      id: budget.id,
      budgetCode: budget.budget_code,
      title: budget.title,
      fiscalYear: budget.fiscal_year,
      status: budget.status,
      project: budget.project,
      totalApproved,
      totalActual,
      totalCommitted,
      variance,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      totalApproved: acc.totalApproved + r.totalApproved,
      totalActual: acc.totalActual + r.totalActual,
      totalVariance: acc.totalVariance + r.variance,
    }),
    { totalApproved: 0, totalActual: 0, totalVariance: 0 }
  )

  return { rows, totals }
}

async function buildCostReport(fiscalYear?: number) {
  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscal_year = fiscalYear

  const budgets = await prisma.budget.findMany({
    where,
    include: { lines: true },
  })

  const categoryMap = new Map<
    string,
    { category: string; approved: number; actual: number; committed: number }
  >()

  for (const budget of budgets) {
    for (const line of budget.lines) {
      const key = line.category
      const existing = categoryMap.get(key) ?? {
        category: key,
        approved: 0,
        actual: 0,
        committed: 0,
      }
      categoryMap.set(key, {
        category: key,
        approved: existing.approved + line.approved_amount,
        actual: existing.actual + line.actual_amount,
        committed: existing.committed + line.committed_amount,
      })
    }
  }

  const rows = Array.from(categoryMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category)
  )
  const totalActual = rows.reduce((sum, r) => sum + r.actual, 0)

  return { rows, totalActual }
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
        .get(
          '/pm-compliance',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildPMComplianceReport(query.projectId)
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          }
        )
  )
