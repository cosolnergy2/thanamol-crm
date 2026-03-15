import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const periodQuerySchema = t.Object({
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
})

function parseDateRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {}
  if (from) range.gte = new Date(from)
  if (to) range.lte = new Date(to)
  return range
}

export const reportsRoutes = new Elysia({ prefix: '/api/reports' })
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
          '/sales',
          async ({ query }) => {
            const dateRange = parseDateRange(query.from, query.to)

            const where = dateRange.gte || dateRange.lte
              ? { actual_close_date: dateRange }
              : {}

            const wonWhere = { ...where, stage: 'CLOSED_WON' as const }
            const lostWhere = { ...where, stage: 'CLOSED_LOST' as const }

            const [totalDeals, wonDeals, lostDeals, byStage, wonValueAgg] = await Promise.all([
              prisma.deal.count({ where }),
              prisma.deal.count({ where: wonWhere }),
              prisma.deal.count({ where: lostWhere }),
              prisma.deal.groupBy({
                by: ['stage'],
                where,
                _count: { _all: true },
                _sum: { value: true },
              }),
              prisma.deal.aggregate({
                where: wonWhere,
                _sum: { value: true },
                _avg: { value: true },
              }),
            ])

            const byStageFormatted = byStage.map((s) => ({
              stage: s.stage,
              count: s._count._all,
              totalValue: s._sum.value ?? 0,
            }))

            return {
              summary: {
                totalDeals,
                dealsWon: wonDeals,
                dealsLost: lostDeals,
                totalWonValue: wonValueAgg._sum.value ?? 0,
                avgDealValue: wonValueAgg._avg.value ?? 0,
                winRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
              },
              byStage: byStageFormatted,
            }
          },
          { query: periodQuerySchema }
        )
        .get(
          '/revenue',
          async ({ query }) => {
            const dateRange = parseDateRange(query.from, query.to)

            const invoiceWhere = dateRange.gte || dateRange.lte
              ? { created_at: dateRange }
              : {}

            const [byStatus, totalAgg] = await Promise.all([
              prisma.invoice.groupBy({
                by: ['status'],
                where: invoiceWhere,
                _count: { _all: true },
                _sum: { total: true },
              }),
              prisma.invoice.aggregate({
                where: invoiceWhere,
                _sum: { total: true },
              }),
            ])

            const paidGroup = byStatus.find((s) => s.status === 'PAID')
            const overdueGroup = byStatus.find((s) => s.status === 'OVERDUE')
            const sentGroup = byStatus.find((s) => s.status === 'SENT')
            const partialGroup = byStatus.find((s) => s.status === 'PARTIAL')

            const totalBilled = totalAgg._sum.total ?? 0
            const totalCollected = (paidGroup?._sum.total ?? 0) + (partialGroup?._sum.total ?? 0)
            const totalOutstanding = (sentGroup?._sum.total ?? 0) + (overdueGroup?._sum.total ?? 0)

            return {
              summary: {
                totalBilled,
                totalCollected,
                totalOutstanding,
                totalOverdue: overdueGroup?._sum.total ?? 0,
                collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
              },
              byStatus: byStatus.map((s) => ({
                status: s.status,
                count: s._count._all,
                total: s._sum.total ?? 0,
              })),
            }
          },
          { query: periodQuerySchema }
        )
        .get('/occupancy', async () => {
          const [projects, unitsByStatus] = await Promise.all([
            prisma.project.findMany({
              select: { id: true, name: true, code: true, status: true, total_units: true },
              orderBy: { name: 'asc' },
            }),
            prisma.unit.groupBy({
              by: ['project_id', 'status'],
              _count: { _all: true },
            }),
          ])

          const unitCountMap: Record<string, Record<string, number>> = {}
          for (const row of unitsByStatus) {
            if (!unitCountMap[row.project_id]) unitCountMap[row.project_id] = {}
            unitCountMap[row.project_id][row.status] = row._count._all
          }

          const projectOccupancy = projects.map((project) => {
            const counts = unitCountMap[project.id] ?? {}
            const available = counts['AVAILABLE'] ?? 0
            const reserved = counts['RESERVED'] ?? 0
            const sold = counts['SOLD'] ?? 0
            const rented = counts['RENTED'] ?? 0
            const underMaintenance = counts['UNDER_MAINTENANCE'] ?? 0
            const totalUnits = available + reserved + sold + rented + underMaintenance
            const occupied = sold + rented + reserved
            const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0

            return {
              projectId: project.id,
              projectName: project.name,
              projectCode: project.code,
              projectStatus: project.status,
              totalUnits,
              available,
              reserved,
              sold,
              rented,
              underMaintenance,
              occupied,
              occupancyRate,
            }
          })

          const totalUnitsAll = projectOccupancy.reduce((sum, p) => sum + p.totalUnits, 0)
          const totalOccupied = projectOccupancy.reduce((sum, p) => sum + p.occupied, 0)
          const totalAvailable = projectOccupancy.reduce((sum, p) => sum + p.available, 0)

          return {
            summary: {
              totalProjects: projects.length,
              totalUnits: totalUnitsAll,
              totalOccupied,
              totalAvailable,
              overallOccupancyRate:
                totalUnitsAll > 0 ? Math.round((totalOccupied / totalUnitsAll) * 100) : 0,
            },
            byProject: projectOccupancy,
          }
        })
        .get(
          '/collection',
          async ({ query }) => {
            const dateRange = parseDateRange(query.from, query.to)

            const invoiceWhere = dateRange.gte || dateRange.lte
              ? { due_date: dateRange }
              : {}

            const invoices = await prisma.invoice.findMany({
              where: invoiceWhere,
              select: {
                id: true,
                status: true,
                total: true,
                due_date: true,
                payments: {
                  select: { amount: true, payment_date: true },
                },
              },
            })

            let onTime = 0
            let overdue = 0
            let pending = 0
            let totalCollected = 0
            let totalOverdue = 0

            for (const invoice of invoices) {
              if (invoice.status === 'PAID') {
                const lastPayment = invoice.payments.at(-1)
                const paidOnTime =
                  !invoice.due_date ||
                  !lastPayment ||
                  lastPayment.payment_date <= invoice.due_date
                if (paidOnTime) {
                  onTime++
                } else {
                  overdue++
                }
                totalCollected += invoice.total
              } else if (invoice.status === 'OVERDUE') {
                overdue++
                totalOverdue += invoice.total
              } else if (invoice.status === 'SENT' || invoice.status === 'PARTIAL') {
                pending++
              }
            }

            const collectedCount = onTime + overdue
            const onTimeRate =
              collectedCount > 0 ? Math.round((onTime / collectedCount) * 100) : 0

            return {
              summary: {
                totalInvoices: invoices.length,
                paidOnTime: onTime,
                paidOverdue: overdue,
                pending,
                totalCollected,
                totalOverdue,
                onTimePaymentRate: onTimeRate,
              },
            }
          },
          { query: periodQuerySchema }
        )
  )
