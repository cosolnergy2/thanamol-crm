import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createVisitorSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  visitorName: t.String({ minLength: 1 }),
  company: t.Optional(t.String()),
  purpose: t.Optional(t.String()),
  hostName: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  expectedDate: t.Optional(t.String()),
  idNumber: t.Optional(t.String()),
  vehiclePlate: t.Optional(t.String()),
  badgeNumber: t.Optional(t.String()),
  photoUrl: t.Optional(t.String()),
})

const updateVisitorSchema = t.Object({
  visitorName: t.Optional(t.String({ minLength: 1 })),
  company: t.Optional(t.String()),
  purpose: t.Optional(t.String()),
  hostName: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  expectedDate: t.Optional(t.String()),
  idNumber: t.Optional(t.String()),
  vehiclePlate: t.Optional(t.String()),
  badgeNumber: t.Optional(t.String()),
  photoUrl: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsVisitorsRoutes = new Elysia({ prefix: '/api/fms/visitors' })
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
            if (query.status) where.status = query.status

            if (query.search) {
              where.OR = [
                { visitor_name: { contains: query.search, mode: 'insensitive' } },
                { company: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, visitors] = await Promise.all([
              prisma.visitor.count({ where }),
              prisma.visitor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { unit: { select: { id: true, unit_number: true } } },
              }),
            ])

            return { data: visitors, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const visitor = await prisma.visitor.findUnique({
            where: { id: params.id },
            include: { unit: { select: { id: true, unit_number: true } } },
          })
          if (!visitor) {
            set.status = 404
            return { error: 'Visitor not found' }
          }
          return { visitor }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const visitor = await prisma.visitor.create({
              data: {
                project_id: body.projectId,
                visitor_name: body.visitorName,
                company: body.company,
                purpose: body.purpose,
                host_name: body.hostName,
                unit_id: body.unitId,
                expected_date: body.expectedDate ? new Date(body.expectedDate) : null,
                id_number: body.idNumber,
                vehicle_plate: body.vehiclePlate,
                badge_number: body.badgeNumber,
                photo_url: body.photoUrl,
                status: 'EXPECTED',
              },
            })
            set.status = 201
            return { visitor }
          },
          { body: createVisitorSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.visitor.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Visitor not found' }
            }

            const visitor = await prisma.visitor.update({
              where: { id: params.id },
              data: {
                visitor_name: body.visitorName,
                company: body.company,
                purpose: body.purpose,
                host_name: body.hostName,
                unit_id: body.unitId,
                expected_date: body.expectedDate ? new Date(body.expectedDate) : undefined,
                id_number: body.idNumber,
                vehicle_plate: body.vehiclePlate,
                badge_number: body.badgeNumber,
                photo_url: body.photoUrl,
              },
            })
            return { visitor }
          },
          { body: updateVisitorSchema },
        )
        .patch('/:id/check-in', async ({ params, set }) => {
          const existing = await prisma.visitor.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Visitor not found' }
          }
          if (existing.status !== 'EXPECTED') {
            set.status = 409
            return { error: 'Visitor is not in EXPECTED status' }
          }

          const visitor = await prisma.visitor.update({
            where: { id: params.id },
            data: { status: 'CHECKED_IN', check_in_time: new Date() },
          })
          return { visitor }
        })
        .patch('/:id/check-out', async ({ params, set }) => {
          const existing = await prisma.visitor.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Visitor not found' }
          }
          if (existing.status !== 'CHECKED_IN') {
            set.status = 409
            return { error: 'Visitor is not checked in' }
          }

          const visitor = await prisma.visitor.update({
            where: { id: params.id },
            data: { status: 'CHECKED_OUT', check_out_time: new Date() },
          })
          return { visitor }
        })
        .patch('/:id/cancel', async ({ params, set }) => {
          const existing = await prisma.visitor.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Visitor not found' }
          }

          const visitor = await prisma.visitor.update({
            where: { id: params.id },
            data: { status: 'CANCELLED' },
          })
          return { visitor }
        })
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.visitor.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Visitor not found' }
          }
          await prisma.visitor.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
