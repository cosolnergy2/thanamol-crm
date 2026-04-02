import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const PM_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'CUSTOM'] as const

async function generatePMNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `PM-${yearMonth}-`

  const count = await prisma.preventiveMaintenance.count({
    where: { pm_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

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

const pmInclude = {
  asset: { select: { id: true, asset_number: true, name: true } },
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  _count: { select: { logs: true } },
}

const createPMSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  assetId: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  frequency: t.Optional(t.String()),
  customIntervalDays: t.Optional(t.Number()),
  checklist: t.Optional(t.Array(t.Unknown())),
  assignedTo: t.Optional(t.String()),
  nextDueDate: t.Optional(t.String()),
  scopeType: t.Optional(t.String()),
  triggerType: t.Optional(t.String()),
  estimatedDuration: t.Optional(t.Number()),
  spareParts: t.Optional(t.Array(t.Unknown())),
  autoCreateWo: t.Optional(t.Boolean()),
  autoWoDaysBefore: t.Optional(t.Number()),
  createdBy: t.String({ minLength: 1 }),
})

const updatePMSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  assetId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  frequency: t.Optional(t.String()),
  customIntervalDays: t.Optional(t.Number()),
  checklist: t.Optional(t.Array(t.Unknown())),
  assignedTo: t.Optional(t.String()),
  nextDueDate: t.Optional(t.String()),
  isActive: t.Optional(t.Boolean()),
  lastCompletedDate: t.Optional(t.String()),
  scopeType: t.Optional(t.String()),
  triggerType: t.Optional(t.String()),
  estimatedDuration: t.Optional(t.Number()),
  spareParts: t.Optional(t.Array(t.Unknown())),
  autoCreateWo: t.Optional(t.Boolean()),
  autoWoDaysBefore: t.Optional(t.Number()),
})

export const fmsPMRoutes = new Elysia({ prefix: '/api/fms/preventive-maintenance' })
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
            if (query.isActive !== undefined) where.is_active = query.isActive === 'true'
            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { pm_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, pms] = await Promise.all([
              prisma.preventiveMaintenance.count({ where }),
              prisma.preventiveMaintenance.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: pmInclude,
              }),
            ])

            return { data: pms, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              assetId: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const pm = await prisma.preventiveMaintenance.findUnique({
            where: { id: params.id },
            include: {
              ...pmInclude,
              logs: {
                orderBy: { scheduled_date: 'desc' },
                take: 10,
                include: {
                  work_order: { select: { id: true, wo_number: true, status: true } },
                  completer: { select: { id: true, first_name: true, last_name: true } },
                },
              },
            },
          })
          if (!pm) {
            set.status = 404
            return { error: 'PM schedule not found' }
          }
          return { pm }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const pmNumber = await generatePMNumber()

            const pm = await prisma.preventiveMaintenance.create({
              data: {
                pm_number: pmNumber,
                title: body.title,
                description: body.description ?? null,
                asset_id: body.assetId ?? null,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                frequency: (body.frequency as typeof PM_FREQUENCIES[number]) ?? 'MONTHLY',
                custom_interval_days: body.customIntervalDays ?? null,
                checklist: (body.checklist as object[]) ?? [],
                assigned_to: body.assignedTo ?? null,
                next_due_date: body.nextDueDate ? new Date(body.nextDueDate) : null,
                scope_type: body.scopeType ?? null,
                trigger_type: body.triggerType ?? null,
                estimated_duration: body.estimatedDuration ?? null,
                spare_parts: (body.spareParts as object[]) ?? [],
                auto_create_wo: body.autoCreateWo ?? false,
                auto_wo_days_before: body.autoWoDaysBefore ?? null,
                created_by: body.createdBy,
              },
              include: pmInclude,
            })
            set.status = 201
            return { pm }
          },
          { body: createPMSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.preventiveMaintenance.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'PM schedule not found' }
            }

            const pm = await prisma.preventiveMaintenance.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                asset_id: body.assetId,
                zone_id: body.zoneId,
                frequency: body.frequency as typeof PM_FREQUENCIES[number] | undefined,
                custom_interval_days: body.customIntervalDays,
                checklist: body.checklist as object[] | undefined,
                assigned_to: body.assignedTo,
                next_due_date: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
                is_active: body.isActive,
                last_completed_date: body.lastCompletedDate
                  ? new Date(body.lastCompletedDate)
                  : undefined,
                scope_type: body.scopeType,
                trigger_type: body.triggerType,
                estimated_duration: body.estimatedDuration,
                spare_parts: body.spareParts as object[] | undefined,
                auto_create_wo: body.autoCreateWo,
                auto_wo_days_before: body.autoWoDaysBefore,
              },
              include: pmInclude,
            })
            return { pm }
          },
          { body: updatePMSchema }
        )
        .post(
          '/:id/generate-work-order',
          async ({ params, body, authUser, set }) => {
            const pm = await prisma.preventiveMaintenance.findUnique({
              where: { id: params.id },
            })
            if (!pm) {
              set.status = 404
              return { error: 'PM schedule not found' }
            }

            const woNumber = await generateWONumber()
            const scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : new Date()

            const workOrder = await prisma.workOrder.create({
              data: {
                wo_number: woNumber,
                title: `PM: ${pm.title}`,
                description: pm.description,
                type: 'PREVENTIVE',
                priority: 'MEDIUM',
                asset_id: pm.asset_id,
                project_id: pm.project_id,
                zone_id: pm.zone_id,
                assigned_to: pm.assigned_to,
                scheduled_date: scheduledDate,
                created_by: (authUser as { id: string }).id,
              },
            })

            await prisma.pMScheduleLog.create({
              data: {
                pm_id: pm.id,
                work_order_id: workOrder.id,
                scheduled_date: scheduledDate,
                status: 'PENDING',
              },
            })

            return { workOrder }
          },
          {
            body: t.Object({
              scheduledDate: t.Optional(t.String()),
            }),
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const pm = await prisma.preventiveMaintenance.findUnique({
            where: { id: params.id },
          })
          if (!pm) {
            set.status = 404
            return { error: 'PM schedule not found' }
          }

          await prisma.preventiveMaintenance.delete({ where: { id: params.id } })
          return { success: true }
        })
        .post(
          '/:id/inspect',
          async ({ params, body, set }) => {
            const pm = await prisma.preventiveMaintenance.findUnique({
              where: { id: params.id },
            })
            if (!pm) {
              set.status = 404
              return { error: 'PM schedule not found' }
            }

            const inspection = await prisma.pMInspection.create({
              data: {
                pm_id: params.id,
                inspection_date: new Date(body.inspectionDate),
                inspector_name: body.inspectorName,
                checklist_results: (body.checklistResults as object[]) ?? [],
                passed: body.passed,
                notes: body.notes ?? null,
              },
            })

            set.status = 201
            return { inspection }
          },
          {
            body: t.Object({
              inspectionDate: t.String({ minLength: 1 }),
              inspectorName: t.String({ minLength: 1 }),
              checklistResults: t.Optional(t.Array(t.Unknown())),
              passed: t.Boolean(),
              notes: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id/inspections',
          async ({ params, query, set }) => {
            const pm = await prisma.preventiveMaintenance.findUnique({
              where: { id: params.id },
            })
            if (!pm) {
              set.status = 404
              return { error: 'PM schedule not found' }
            }

            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const [total, inspections] = await Promise.all([
              prisma.pMInspection.count({ where: { pm_id: params.id } }),
              prisma.pMInspection.findMany({
                where: { pm_id: params.id },
                skip,
                take: limit,
                orderBy: { inspection_date: 'desc' },
              }),
            ])

            return { data: inspections, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
  )
