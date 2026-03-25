import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createServiceLogSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  serviceType: t.String({ minLength: 1 }),
  provider: t.Optional(t.String()),
  serviceDate: t.String(),
  nextServiceDate: t.Optional(t.String()),
  checklist: t.Optional(t.Array(t.Any())),
  cost: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

const updateServiceLogSchema = t.Object({
  serviceType: t.Optional(t.String({ minLength: 1 })),
  provider: t.Optional(t.String()),
  serviceDate: t.Optional(t.String()),
  nextServiceDate: t.Optional(t.String()),
  checklist: t.Optional(t.Array(t.Any())),
  cost: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsServiceLogsRoutes = new Elysia({ prefix: '/api/fms/service-logs' })
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
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.serviceType) where.service_type = query.serviceType

            const [total, serviceLogs] = await Promise.all([
              prisma.serviceLog.count({ where }),
              prisma.serviceLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { service_date: 'desc' },
                include: {
                  creator: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return { data: serviceLogs, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              serviceType: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const serviceLog = await prisma.serviceLog.findUnique({
            where: { id: params.id },
            include: {
              creator: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!serviceLog) {
            set.status = 404
            return { error: 'Service log not found' }
          }
          return { serviceLog }
        })
        .post(
          '/',
          async ({ body, set, authUser }) => {
            const serviceLog = await prisma.serviceLog.create({
              data: {
                project_id: body.projectId,
                service_type: body.serviceType,
                provider: body.provider,
                service_date: new Date(body.serviceDate),
                next_service_date: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
                checklist: body.checklist ?? [],
                cost: body.cost,
                notes: body.notes,
                created_by: authUser?.id,
              },
            })
            set.status = 201
            return { serviceLog }
          },
          { body: createServiceLogSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.serviceLog.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Service log not found' }
            }

            const serviceLog = await prisma.serviceLog.update({
              where: { id: params.id },
              data: {
                service_type: body.serviceType,
                provider: body.provider,
                service_date: body.serviceDate ? new Date(body.serviceDate) : undefined,
                next_service_date: body.nextServiceDate
                  ? new Date(body.nextServiceDate)
                  : undefined,
                checklist: body.checklist,
                cost: body.cost,
                notes: body.notes,
              },
            })
            return { serviceLog }
          },
          { body: updateServiceLogSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.serviceLog.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Service log not found' }
          }
          await prisma.serviceLog.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
