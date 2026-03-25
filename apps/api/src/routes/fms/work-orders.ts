import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const WO_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const
const WO_TYPES = ['CORRECTIVE', 'PREVENTIVE', 'EMERGENCY', 'INSPECTION', 'CALIBRATION'] as const

async function generateWONumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `WO-${yearMonth}-`

  const count = await prisma.workOrder.count({
    where: { wo_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const workOrderInclude = {
  asset: { select: { id: true, asset_number: true, name: true } },
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true } },
  unit: { select: { id: true, unit_number: true } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
}

const createWOSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  type: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  assetId: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  estimatedHours: t.Optional(t.Number()),
  scheduledDate: t.Optional(t.String()),
  costEstimate: t.Optional(t.Number()),
  createdBy: t.String({ minLength: 1 }),
})

const updateWOSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  type: t.Optional(t.String()),
  priority: t.Optional(t.String()),
  status: t.Optional(t.String()),
  assetId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  estimatedHours: t.Optional(t.Number()),
  actualHours: t.Optional(t.Number()),
  scheduledDate: t.Optional(t.String()),
  startedAt: t.Optional(t.String()),
  completedAt: t.Optional(t.String()),
  completionNotes: t.Optional(t.String()),
  partsUsed: t.Optional(t.Array(t.Unknown())),
  costEstimate: t.Optional(t.Number()),
  actualCost: t.Optional(t.Number()),
})

export const fmsWorkOrdersRoutes = new Elysia({ prefix: '/api/fms/work-orders' })
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
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.projectId) where.project_id = query.projectId
            if (query.assetId) where.asset_id = query.assetId
            if (query.assignedTo) where.assigned_to = query.assignedTo
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.type && query.type !== 'all') where.type = query.type
            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { wo_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, workOrders] = await Promise.all([
              prisma.workOrder.count({ where }),
              prisma.workOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: workOrderInclude,
              }),
            ])

            return { data: workOrders, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              assetId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              type: t.Optional(t.String()),
              assignedTo: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const workOrder = await prisma.workOrder.findUnique({
            where: { id: params.id },
            include: {
              ...workOrderInclude,
              pm_logs: {
                include: {
                  pm: { select: { id: true, pm_number: true, title: true } },
                },
                orderBy: { created_at: 'desc' },
              },
            },
          })
          if (!workOrder) {
            set.status = 404
            return { error: 'Work order not found' }
          }
          return { workOrder }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const woNumber = await generateWONumber()

            const workOrder = await prisma.workOrder.create({
              data: {
                wo_number: woNumber,
                title: body.title,
                description: body.description ?? null,
                type: (body.type as typeof WO_TYPES[number]) ?? 'CORRECTIVE',
                priority: body.priority ?? 'MEDIUM',
                asset_id: body.assetId ?? null,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                unit_id: body.unitId ?? null,
                assigned_to: body.assignedTo ?? null,
                estimated_hours: body.estimatedHours ?? null,
                scheduled_date: body.scheduledDate ? new Date(body.scheduledDate) : null,
                cost_estimate: body.costEstimate ?? null,
                created_by: body.createdBy,
              },
              include: workOrderInclude,
            })
            set.status = 201
            return { workOrder }
          },
          { body: createWOSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.workOrder.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Work order not found' }
            }

            const workOrder = await prisma.workOrder.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                type: body.type as typeof WO_TYPES[number] | undefined,
                priority: body.priority,
                status: body.status as typeof WO_STATUSES[number] | undefined,
                asset_id: body.assetId,
                zone_id: body.zoneId,
                unit_id: body.unitId,
                assigned_to: body.assignedTo,
                estimated_hours: body.estimatedHours,
                actual_hours: body.actualHours,
                scheduled_date: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
                started_at: body.startedAt ? new Date(body.startedAt) : undefined,
                completed_at: body.completedAt ? new Date(body.completedAt) : undefined,
                completion_notes: body.completionNotes,
                parts_used: body.partsUsed as object[] | undefined,
                cost_estimate: body.costEstimate,
                actual_cost: body.actualCost,
              },
              include: workOrderInclude,
            })
            return { workOrder }
          },
          { body: updateWOSchema }
        )
        .patch(
          '/:id/assign',
          async ({ params, body, set }) => {
            const existing = await prisma.workOrder.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Work order not found' }
            }

            const workOrder = await prisma.workOrder.update({
              where: { id: params.id },
              data: {
                assigned_to: body.assignedTo,
                status: 'ASSIGNED',
              },
              include: workOrderInclude,
            })
            return { workOrder }
          },
          {
            body: t.Object({
              assignedTo: t.String({ minLength: 1 }),
            }),
          }
        )
        .patch(
          '/:id/start',
          async ({ params, set }) => {
            const existing = await prisma.workOrder.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Work order not found' }
            }

            const workOrder = await prisma.workOrder.update({
              where: { id: params.id },
              data: {
                status: 'IN_PROGRESS',
                started_at: new Date(),
              },
              include: workOrderInclude,
            })
            return { workOrder }
          }
        )
        .patch(
          '/:id/complete',
          async ({ params, body, set }) => {
            const existing = await prisma.workOrder.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Work order not found' }
            }

            const workOrder = await prisma.workOrder.update({
              where: { id: params.id },
              data: {
                status: 'COMPLETED',
                completed_at: new Date(),
                completion_notes: body.completionNotes ?? null,
                actual_hours: body.actualHours ?? null,
                actual_cost: body.actualCost ?? null,
                parts_used: (body.partsUsed as object[]) ?? [],
              },
              include: workOrderInclude,
            })
            return { workOrder }
          },
          {
            body: t.Object({
              completionNotes: t.Optional(t.String()),
              actualHours: t.Optional(t.Number()),
              actualCost: t.Optional(t.Number()),
              partsUsed: t.Optional(t.Array(t.Unknown())),
            }),
          }
        )
        .patch(
          '/:id/cancel',
          async ({ params, body, set }) => {
            const existing = await prisma.workOrder.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Work order not found' }
            }

            const workOrder = await prisma.workOrder.update({
              where: { id: params.id },
              data: {
                status: 'CANCELLED',
                completion_notes: body.reason ?? null,
              },
              include: workOrderInclude,
            })
            return { workOrder }
          },
          {
            body: t.Object({
              reason: t.Optional(t.String()),
            }),
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const workOrder = await prisma.workOrder.findUnique({ where: { id: params.id } })
          if (!workOrder) {
            set.status = 404
            return { error: 'Work order not found' }
          }

          await prisma.workOrder.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
