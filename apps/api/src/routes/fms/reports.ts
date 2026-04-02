import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'
import type { PredictiveMaintenanceItem } from '@thanamol/shared'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
const HIGH_WO_FREQUENCY_THRESHOLD = 3

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

async function buildEnergyReport(
  projectId: string,
  startDate?: string,
  endDate?: string,
  periodType: 'month' | 'week' = 'month',
) {
  const where: Record<string, unknown> = { project_id: projectId }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    where.reading_date = dateFilter
  }

  const readings = await prisma.fmsMeterRecord.findMany({
    where,
    orderBy: { reading_date: 'asc' },
  })

  const consumptionByType = readings.reduce<
    Record<string, { totalConsumption: number; readingCount: number; unit: string }>
  >((acc, reading) => {
    const key = reading.meter_type
    const consumption = Math.max(0, reading.value - (reading.previous_value ?? 0))
    const existing = acc[key] ?? { totalConsumption: 0, readingCount: 0, unit: reading.unit }
    acc[key] = {
      totalConsumption: existing.totalConsumption + consumption,
      readingCount: existing.readingCount + 1,
      unit: reading.unit,
    }
    return acc
  }, {})

  const periodKey = (date: Date): string => {
    if (periodType === 'week') {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - d.getDay())
      return d.toISOString().slice(0, 10)
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const periodMap = new Map<
    string,
    Record<string, { consumption: number; unit: string }>
  >()

  for (const reading of readings) {
    const key = periodKey(reading.reading_date)
    const consumption = Math.max(0, reading.value - (reading.previous_value ?? 0))
    const existing = periodMap.get(key) ?? {}
    const typeData = existing[reading.meter_type] ?? { consumption: 0, unit: reading.unit }
    existing[reading.meter_type] = {
      consumption: typeData.consumption + consumption,
      unit: reading.unit,
    }
    periodMap.set(key, existing)
  }

  const byPeriod = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, types]) => ({ period, ...types }))

  return { consumptionByType, byPeriod }
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

async function buildPredictiveMaintenanceReport(projectId: string): Promise<{
  items: PredictiveMaintenanceItem[]
  summary: { total: number; high: number; medium: number; low: number }
}> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - NINETY_DAYS_MS)
  const projectFilter = { project_id: projectId }

  const [assets, workOrders, pmSchedules, calibrations] = await Promise.all([
    prisma.asset.findMany({
      where: projectFilter,
      select: { id: true, name: true, warranty_expiry: true },
    }),
    prisma.workOrder.findMany({
      where: { ...projectFilter, created_at: { gte: ninetyDaysAgo } },
      select: { asset_id: true },
    }),
    prisma.preventiveMaintenance.findMany({
      where: { ...projectFilter, is_active: true },
      select: { asset_id: true },
    }),
    prisma.calibrationRecord.findMany({
      where: { asset: { project_id: projectId } },
      select: { asset_id: true, status: true, calibration_date: true },
      orderBy: { calibration_date: 'asc' },
    }),
  ])

  const woCountByAsset = new Map<string, number>()
  for (const wo of workOrders) {
    if (wo.asset_id) {
      woCountByAsset.set(wo.asset_id, (woCountByAsset.get(wo.asset_id) ?? 0) + 1)
    }
  }

  const pmAssetIds = new Set(pmSchedules.map((pm) => pm.asset_id).filter(Boolean) as string[])

  const calibrationsByAsset = new Map<string, typeof calibrations>()
  for (const cal of calibrations) {
    const list = calibrationsByAsset.get(cal.asset_id) ?? []
    list.push(cal)
    calibrationsByAsset.set(cal.asset_id, list)
  }

  const itemMap = new Map<string, PredictiveMaintenanceItem>()

  for (const asset of assets) {
    const woCount = woCountByAsset.get(asset.id) ?? 0
    if (woCount > HIGH_WO_FREQUENCY_THRESHOLD) {
      itemMap.set(asset.id, {
        assetId: asset.id,
        assetName: asset.name,
        riskLevel: 'HIGH',
        reason: `${woCount} work orders raised in the last 90 days (threshold: ${HIGH_WO_FREQUENCY_THRESHOLD})`,
        recommendation: 'Schedule a comprehensive inspection and review asset replacement options',
      })
      continue
    }

    if (asset.warranty_expiry && asset.warranty_expiry < now && !pmAssetIds.has(asset.id)) {
      itemMap.set(asset.id, {
        assetId: asset.id,
        assetName: asset.name,
        riskLevel: 'MEDIUM',
        reason: 'Warranty expired and no active preventive maintenance schedule linked',
        recommendation: 'Create a preventive maintenance schedule to extend asset lifespan',
      })
      continue
    }

    const assetCals = calibrationsByAsset.get(asset.id)
    if (assetCals && assetCals.length > 0) {
      const hasFailure = assetCals.some((c) => c.status === 'FAILED')
      const hasIncreasingDeviation = detectIncreasingDeviation(assetCals)

      if (hasFailure || hasIncreasingDeviation) {
        const reason = hasFailure
          ? 'Calibration record with FAILED status found'
          : 'Calibration records show increasing deviation trend'
        itemMap.set(asset.id, {
          assetId: asset.id,
          assetName: asset.name,
          riskLevel: hasFailure ? 'HIGH' : 'MEDIUM',
          reason,
          recommendation: 'Perform immediate recalibration and inspect for root cause',
        })
      }
    }
  }

  const items = Array.from(itemMap.values()).sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return order[a.riskLevel] - order[b.riskLevel]
  })

  const summary = {
    total: items.length,
    high: items.filter((i) => i.riskLevel === 'HIGH').length,
    medium: items.filter((i) => i.riskLevel === 'MEDIUM').length,
    low: items.filter((i) => i.riskLevel === 'LOW').length,
  }

  return { items, summary }
}

function detectIncreasingDeviation(
  calibrations: Array<{ calibration_date: Date; status: string }>
): boolean {
  if (calibrations.length < 3) return false

  const sorted = [...calibrations].sort(
    (a, b) => a.calibration_date.getTime() - b.calibration_date.getTime()
  )
  const recent = sorted.slice(-3)
  const failureOrOverdueStatuses = ['FAILED', 'OVERDUE']
  const failingCount = recent.filter((c) => failureOrOverdueStatuses.includes(c.status)).length
  return failingCount >= 2
}

const ABC_A_CUMULATIVE_THRESHOLD = 0.8
const ABC_AB_CUMULATIVE_THRESHOLD = 0.95
const DEAD_STOCK_THRESHOLD_DAYS = 90
const ANALYSIS_MONTHS = 12
const DEFAULT_LEAD_TIME_DAYS = 7

async function buildInventoryAnalysisReport(projectId?: string) {
  const projectFilter = projectId ? { project_id: projectId } : {}

  const items = await prisma.inventoryItem.findMany({
    where: { ...projectFilter, is_active: true },
    include: {
      stock_movements: {
        orderBy: { created_at: 'desc' },
      },
    },
  })

  const now = new Date()
  const analysisStartDate = new Date(now)
  analysisStartDate.setMonth(analysisStartDate.getMonth() - ANALYSIS_MONTHS)

  // ── ABC Analysis ──────────────────────────────────────────────────────────
  const itemSpend = items.map((item) => {
    const annualMovements = item.stock_movements.filter(
      (m) => m.created_at >= analysisStartDate && m.quantity > 0
    )
    const totalConsumed = annualMovements.reduce((sum, m) => sum + m.quantity, 0)
    const annualSpend = totalConsumed * (item.unit_cost ?? 0)
    return { item, annualSpend }
  })

  const totalSpend = itemSpend.reduce((sum, e) => sum + e.annualSpend, 0)
  const sortedBySpend = [...itemSpend].sort((a, b) => b.annualSpend - a.annualSpend)

  let cumulativeSpend = 0
  const abcAnalysis = sortedBySpend.map((entry) => {
    cumulativeSpend += entry.annualSpend
    const cumulativePct = totalSpend > 0 ? cumulativeSpend / totalSpend : 1
    const category: 'A' | 'B' | 'C' =
      cumulativePct <= ABC_A_CUMULATIVE_THRESHOLD
        ? 'A'
        : cumulativePct <= ABC_AB_CUMULATIVE_THRESHOLD
          ? 'B'
          : 'C'
    return {
      itemId: entry.item.id,
      itemCode: entry.item.item_code,
      itemName: entry.item.name,
      category,
      annualSpend: entry.annualSpend,
      percentOfTotalSpend: totalSpend > 0 ? (entry.annualSpend / totalSpend) * 100 : 0,
    }
  })

  // ── Dead Stock ────────────────────────────────────────────────────────────
  const deadStock = items
    .map((item) => {
      const lastMovement = item.stock_movements[0] ?? null
      const lastMovementDate = lastMovement ? lastMovement.created_at : null
      const daysSinceMovement = lastMovementDate
        ? Math.floor((now.getTime() - lastMovementDate.getTime()) / (24 * 60 * 60 * 1000))
        : DEAD_STOCK_THRESHOLD_DAYS + 1
      return { item, lastMovementDate, daysSinceMovement }
    })
    .filter(({ daysSinceMovement }) => daysSinceMovement > DEAD_STOCK_THRESHOLD_DAYS)
    .map(({ item, lastMovementDate, daysSinceMovement }) => ({
      itemId: item.id,
      itemCode: item.item_code,
      itemName: item.name,
      lastMovementDate: lastMovementDate ? lastMovementDate.toISOString() : null,
      daysSinceMovement,
      currentStock: item.current_stock,
      stockValue: item.current_stock * (item.unit_cost ?? 0),
    }))

  // ── Consumption Trends ────────────────────────────────────────────────────
  const consumptionTrends = items
    .map((item) => {
      const recentMovements = item.stock_movements.filter(
        (m) => m.created_at >= analysisStartDate && m.quantity > 0
      )
      const totalConsumed = recentMovements.reduce((sum, m) => sum + m.quantity, 0)
      const avgMonthlyConsumption = totalConsumed / ANALYSIS_MONTHS
      return {
        itemId: item.id,
        itemCode: item.item_code,
        itemName: item.name,
        totalConsumed,
        movementCount: recentMovements.length,
        avgMonthlyConsumption,
      }
    })
    .filter((entry) => entry.movementCount > 0)
    .sort((a, b) => b.movementCount - a.movementCount)

  // ── Reorder Suggestions ───────────────────────────────────────────────────
  const reorderSuggestions = items
    .map((item) => {
      const recentMovements = item.stock_movements.filter(
        (m) => m.created_at >= analysisStartDate && m.quantity > 0
      )
      const totalConsumed = recentMovements.reduce((sum, m) => sum + m.quantity, 0)
      const avgDailyConsumption = totalConsumed / (ANALYSIS_MONTHS * 30)
      const leadTimeDays = item.lead_time_days ?? DEFAULT_LEAD_TIME_DAYS
      const suggestedReorderPoint = Math.ceil(avgDailyConsumption * leadTimeDays)
      const currentReorderPoint = item.reorder_point ?? null

      let reason: string
      if (currentReorderPoint === null) {
        reason = `No reorder point set. Avg daily: ${avgDailyConsumption.toFixed(2)} × ${leadTimeDays} days lead time`
      } else if (suggestedReorderPoint > currentReorderPoint) {
        reason = `Current reorder point too low. Avg daily: ${avgDailyConsumption.toFixed(2)} × ${leadTimeDays} days lead time`
      } else if (suggestedReorderPoint < currentReorderPoint) {
        reason = `Current reorder point may be too high. Avg daily: ${avgDailyConsumption.toFixed(2)} × ${leadTimeDays} days lead time`
      } else {
        reason = `Reorder point is optimal. Avg daily: ${avgDailyConsumption.toFixed(2)} × ${leadTimeDays} days lead time`
      }

      return {
        itemId: item.id,
        itemCode: item.item_code,
        itemName: item.name,
        currentStock: item.current_stock,
        currentReorderPoint,
        suggestedReorderPoint,
        avgDailyConsumption,
        leadTimeDays,
        reason,
      }
    })
    .filter((s) => s.avgDailyConsumption > 0)
    .sort((a, b) => b.avgDailyConsumption - a.avgDailyConsumption)

  return {
    abcAnalysis,
    deadStock,
    consumptionTrends,
    reorderSuggestions,
    summary: {
      totalItems: items.length,
      totalDeadStockItems: deadStock.length,
      totalDeadStockValue: deadStock.reduce((sum, d) => sum + d.stockValue, 0),
      aItemCount: abcAnalysis.filter((i) => i.category === 'A').length,
      bItemCount: abcAnalysis.filter((i) => i.category === 'B').length,
      cItemCount: abcAnalysis.filter((i) => i.category === 'C').length,
    },
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
        .get('/vendor-summary', async () => {
          const report = await buildVendorSummaryReport()
          return { report }
        })
        .get(
          '/energy',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const periodType = query.periodType === 'week' ? 'week' : 'month'
            const report = await buildEnergyReport(
              query.projectId,
              query.startDate || undefined,
              query.endDate || undefined,
              periodType,
            )
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              startDate: t.Optional(t.String()),
              endDate: t.Optional(t.String()),
              periodType: t.Optional(t.String()),
            }),
          },
        )
        .get(
          '/predictive-maintenance',
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }
            const report = await buildPredictiveMaintenanceReport(query.projectId)
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          },
        )
        .get(
          '/inventory-analysis',
          async ({ query }) => {
            const report = await buildInventoryAnalysisReport(query.projectId || undefined)
            return { report }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          },
        )
  )
