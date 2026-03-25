import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayEnd(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

async function buildSummary(projectId?: string) {
  const projectFilter = projectId ? { project_id: projectId } : {}
  const now = new Date()

  const [
    totalAssets,
    operationalAssets,
    underMaintenanceAssets,
    outOfServiceAssets,
    totalWO,
    openWO,
    inProgressWO,
    completedWO,
    activePM,
    overduePM,
    totalInventory,
    openIncidents,
    investigatingIncidents,
    budgetAggregate,
    activeVendors,
    todayVisitors,
  ] = await Promise.all([
    prisma.asset.count({ where: projectFilter }),
    prisma.asset.count({ where: { ...projectFilter, status: 'OPERATIONAL' } }),
    prisma.asset.count({ where: { ...projectFilter, status: 'UNDER_MAINTENANCE' } }),
    prisma.asset.count({ where: { ...projectFilter, status: 'OUT_OF_SERVICE' } }),

    prisma.workOrder.count({ where: projectFilter }),
    prisma.workOrder.count({ where: { ...projectFilter, status: 'OPEN' } }),
    prisma.workOrder.count({ where: { ...projectFilter, status: 'IN_PROGRESS' } }),
    prisma.workOrder.count({ where: { ...projectFilter, status: 'COMPLETED' } }),

    prisma.preventiveMaintenance.count({ where: { ...projectFilter, is_active: true } }),
    prisma.preventiveMaintenance.count({
      where: { ...projectFilter, is_active: true, next_due_date: { lt: now } },
    }),

    prisma.inventoryItem.count({ where: { ...projectFilter, is_active: true } }),

    prisma.incident.count({ where: { ...projectFilter, status: 'REPORTED' } }),
    prisma.incident.count({ where: { ...projectFilter, status: 'INVESTIGATING' } }),

    prisma.budget.aggregate({
      where: projectFilter,
      _sum: { total_approved: true, total_committed: true, total_actual: true },
    }),

    prisma.vendor.count({ where: { status: 'ACTIVE' } }),

    prisma.visitor.count({
      where: {
        ...projectFilter,
        check_in_time: { gte: todayStart(), lte: todayEnd() },
      },
    }),
  ])

  const allInventory = await prisma.inventoryItem.findMany({
    where: { ...projectFilter, is_active: true, reorder_point: { not: null } },
    select: { current_stock: true, reorder_point: true },
  })
  const lowStock = allInventory.filter(
    (item) => item.reorder_point !== null && item.current_stock <= item.reorder_point
  ).length

  return {
    assets: {
      total: totalAssets,
      operational: operationalAssets,
      underMaintenance: underMaintenanceAssets,
      outOfService: outOfServiceAssets,
    },
    workOrders: {
      total: totalWO,
      open: openWO,
      inProgress: inProgressWO,
      completed: completedWO,
    },
    preventiveMaintenance: {
      active: activePM,
      overdue: overduePM,
    },
    inventory: {
      totalItems: totalInventory,
      lowStock,
    },
    incidents: {
      open: openIncidents,
      investigating: investigatingIncidents,
    },
    budgets: {
      totalApproved: budgetAggregate._sum.total_approved ?? 0,
      totalCommitted: budgetAggregate._sum.total_committed ?? 0,
      totalActual: budgetAggregate._sum.total_actual ?? 0,
    },
    vendors: {
      active: activeVendors,
    },
    visitors: {
      todayCheckedIn: todayVisitors,
    },
  }
}

async function buildRecentActivity(projectId?: string, limit: number = 10) {
  const projectFilter = projectId ? { project_id: projectId } : {}

  const [workOrders, incidents, pmLogs, stockMovements] = await Promise.all([
    prisma.workOrder.findMany({
      where: projectFilter,
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        wo_number: true,
        title: true,
        status: true,
        priority: true,
        created_at: true,
      },
    }),

    prisma.incident.findMany({
      where: projectFilter,
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        incident_number: true,
        title: true,
        severity: true,
        status: true,
        created_at: true,
      },
    }),

    prisma.pMScheduleLog.findMany({
      where: projectId ? { pm: { project_id: projectId } } : {},
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        scheduled_date: true,
        actual_date: true,
        status: true,
        created_at: true,
        pm: { select: { id: true, title: true, pm_number: true } },
      },
    }),

    prisma.stockMovement.findMany({
      where: projectId ? { item: { project_id: projectId } } : {},
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        movement_type: true,
        quantity: true,
        created_at: true,
        item: { select: { id: true, name: true, item_code: true } },
      },
    }),
  ])

  return { workOrders, incidents, pmLogs, stockMovements }
}

export const fmsDashboardRoutes = new Elysia({ prefix: '/api/fms/dashboard' })
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
          '/summary',
          async ({ query }) => {
            const summary = await buildSummary(query.projectId || undefined)
            return { summary }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/recent-activity',
          async ({ query }) => {
            const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10)))
            const activity = await buildRecentActivity(query.projectId || undefined, limit)
            return { activity }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
  )
