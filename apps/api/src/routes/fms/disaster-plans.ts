import { Elysia, t } from 'elysia'
import { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const PLAN_TYPES = ['FIRE', 'EARTHQUAKE', 'FLOOD', 'CHEMICAL', 'OTHER'] as const
const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const planInclude = {
  project: { select: { id: true, name: true, code: true } },
}

const createPlanSchema = t.Object({
  title: t.String({ minLength: 1 }),
  planType: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  procedures: t.Optional(t.Array(t.Unknown())),
  responsiblePersons: t.Optional(t.Array(t.Unknown())),
  reviewDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updatePlanSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  planType: t.Optional(t.String()),
  procedures: t.Optional(t.Array(t.Unknown())),
  responsiblePersons: t.Optional(t.Array(t.Unknown())),
  reviewDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const fmsDisasterPlansRoutes = new Elysia({ prefix: '/api/fms/disaster-plans' })
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
            if (query.planType && query.planType !== 'all') where.plan_type = query.planType
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { notes: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, plans] = await Promise.all([
              prisma.disasterPlan.count({ where }),
              prisma.disasterPlan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: planInclude,
              }),
            ])

            return { data: plans, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              planType: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const plan = await prisma.disasterPlan.findUnique({
            where: { id: params.id },
            include: planInclude,
          })
          if (!plan) {
            set.status = 404
            return { error: 'Disaster plan not found' }
          }
          return { plan }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const plan = await prisma.disasterPlan.create({
              data: {
                title: body.title,
                plan_type: (body.planType as typeof PLAN_TYPES[number]),
                project_id: body.projectId,
                procedures: (body.procedures ?? []) as Prisma.InputJsonValue,
                responsible_persons: (body.responsiblePersons ?? []) as Prisma.InputJsonValue,
                review_date: body.reviewDate ? new Date(body.reviewDate) : null,
                status: (body.status as typeof PLAN_STATUSES[number]) ?? 'DRAFT',
                notes: body.notes ?? null,
              } as Prisma.DisasterPlanUncheckedCreateInput,
              include: planInclude,
            })
            set.status = 201
            return { plan }
          },
          { body: createPlanSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.disasterPlan.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Disaster plan not found' }
            }

            const updateData: Prisma.DisasterPlanUncheckedUpdateInput = {}
            if (body.title !== undefined) updateData.title = body.title
            if (body.planType !== undefined) updateData.plan_type = body.planType as typeof PLAN_TYPES[number]
            if (body.procedures !== undefined) updateData.procedures = body.procedures as Prisma.InputJsonValue
            if (body.responsiblePersons !== undefined) updateData.responsible_persons = body.responsiblePersons as Prisma.InputJsonValue
            if (body.reviewDate !== undefined) updateData.review_date = body.reviewDate ? new Date(body.reviewDate) : null
            if (body.status !== undefined) updateData.status = body.status as typeof PLAN_STATUSES[number]
            if (body.notes !== undefined) updateData.notes = body.notes ?? null

            const plan = await prisma.disasterPlan.update({
              where: { id: params.id },
              data: updateData,
              include: planInclude,
            })
            return { plan }
          },
          { body: updatePlanSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.disasterPlan.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Disaster plan not found' }
          }
          await prisma.disasterPlan.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
