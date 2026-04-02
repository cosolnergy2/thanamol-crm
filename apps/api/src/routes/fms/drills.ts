import { Elysia, t } from 'elysia'
import { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const DRILL_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const
type DrillStatusValue = (typeof DRILL_STATUSES)[number]

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const drillInclude = {
  project: { select: { id: true, name: true, code: true } },
  plan: { select: { id: true, title: true, plan_type: true } },
}

const createDrillSchema = t.Object({
  planId: t.String({ minLength: 1 }),
  drillType: t.String({ minLength: 1 }),
  scheduledDate: t.String({ minLength: 1 }),
  actualDate: t.Optional(t.String()),
  participants: t.Optional(t.Array(t.Unknown())),
  findings: t.Optional(t.String()),
  correctiveActions: t.Optional(t.Array(t.Unknown())),
  status: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
})

const updateDrillSchema = t.Object({
  drillType: t.Optional(t.String()),
  scheduledDate: t.Optional(t.String()),
  actualDate: t.Optional(t.String()),
  participants: t.Optional(t.Array(t.Unknown())),
  findings: t.Optional(t.String()),
  correctiveActions: t.Optional(t.Array(t.Unknown())),
  status: t.Optional(t.String()),
})

const completeDrillSchema = t.Object({
  actualDate: t.String({ minLength: 1 }),
  participants: t.Optional(t.Array(t.Unknown())),
  findings: t.Optional(t.String()),
  correctiveActions: t.Optional(t.Array(t.Unknown())),
})

export const fmsDrillsRoutes = new Elysia({ prefix: '/api/fms/drills' })
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
            if (query.planId) where.plan_id = query.planId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { drill_type: { contains: query.search, mode: 'insensitive' } },
                { findings: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, drills] = await Promise.all([
              prisma.emergencyDrill.count({ where }),
              prisma.emergencyDrill.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduled_date: 'desc' },
                include: drillInclude,
              }),
            ])

            return { data: drills, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              planId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const drill = await prisma.emergencyDrill.findUnique({
            where: { id: params.id },
            include: drillInclude,
          })
          if (!drill) {
            set.status = 404
            return { error: 'Emergency drill not found' }
          }
          return { drill }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const drill = await prisma.emergencyDrill.create({
              data: {
                plan_id: body.planId,
                drill_type: body.drillType,
                scheduled_date: new Date(body.scheduledDate),
                actual_date: body.actualDate ? new Date(body.actualDate) : null,
                participants: (body.participants ?? []) as Prisma.InputJsonValue,
                findings: body.findings ?? null,
                corrective_actions: (body.correctiveActions ?? []) as Prisma.InputJsonValue,
                status: (body.status as DrillStatusValue) ?? 'SCHEDULED',
                project_id: body.projectId,
              } as Prisma.EmergencyDrillUncheckedCreateInput,
              include: drillInclude,
            })
            set.status = 201
            return { drill }
          },
          { body: createDrillSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.emergencyDrill.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Emergency drill not found' }
            }

            const updateData: Prisma.EmergencyDrillUncheckedUpdateInput = {}
            if (body.drillType !== undefined) updateData.drill_type = body.drillType
            if (body.scheduledDate !== undefined) updateData.scheduled_date = new Date(body.scheduledDate)
            if (body.actualDate !== undefined) updateData.actual_date = body.actualDate ? new Date(body.actualDate) : null
            if (body.participants !== undefined) updateData.participants = body.participants as Prisma.InputJsonValue
            if (body.findings !== undefined) updateData.findings = body.findings ?? null
            if (body.correctiveActions !== undefined) updateData.corrective_actions = body.correctiveActions as Prisma.InputJsonValue
            if (body.status !== undefined) updateData.status = body.status as DrillStatusValue

            const drill = await prisma.emergencyDrill.update({
              where: { id: params.id },
              data: updateData,
              include: drillInclude,
            })
            return { drill }
          },
          { body: updateDrillSchema }
        )
        .patch(
          '/:id/complete',
          async ({ params, body, set }) => {
            const existing = await prisma.emergencyDrill.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Emergency drill not found' }
            }
            if (existing.status === 'COMPLETED') {
              set.status = 400
              return { error: 'Drill is already completed' }
            }

            const drill = await prisma.emergencyDrill.update({
              where: { id: params.id },
              data: {
                status: 'COMPLETED',
                actual_date: new Date(body.actualDate),
                participants: (body.participants ?? existing.participants) as Prisma.InputJsonValue,
                findings: body.findings ?? existing.findings ?? null,
                corrective_actions: (body.correctiveActions ?? existing.corrective_actions) as Prisma.InputJsonValue,
              },
              include: drillInclude,
            })
            return { drill }
          },
          { body: completeDrillSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.emergencyDrill.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Emergency drill not found' }
          }
          await prisma.emergencyDrill.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
