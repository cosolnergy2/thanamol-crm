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
  )
