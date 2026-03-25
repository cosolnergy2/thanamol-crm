import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createPatrolSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  routeName: t.String({ minLength: 1 }),
  patrolDate: t.String(),
  startTime: t.Optional(t.String()),
  endTime: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('SCHEDULED'),
      t.Literal('IN_PROGRESS'),
      t.Literal('COMPLETED'),
      t.Literal('MISSED'),
    ]),
  ),
  guardName: t.Optional(t.String()),
  checkpoints: t.Optional(t.Array(t.Any())),
  notes: t.Optional(t.String()),
})

const updatePatrolSchema = t.Object({
  routeName: t.Optional(t.String({ minLength: 1 })),
  patrolDate: t.Optional(t.String()),
  startTime: t.Optional(t.String()),
  endTime: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('SCHEDULED'),
      t.Literal('IN_PROGRESS'),
      t.Literal('COMPLETED'),
      t.Literal('MISSED'),
    ]),
  ),
  guardName: t.Optional(t.String()),
  checkpoints: t.Optional(t.Array(t.Any())),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsSecurityPatrolsRoutes = new Elysia({ prefix: '/api/fms/security-patrols' })
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

            const [total, patrols] = await Promise.all([
              prisma.securityPatrol.count({ where }),
              prisma.securityPatrol.findMany({
                where,
                skip,
                take: limit,
                orderBy: { patrol_date: 'desc' },
              }),
            ])

            return { data: patrols, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const patrol = await prisma.securityPatrol.findUnique({ where: { id: params.id } })
          if (!patrol) {
            set.status = 404
            return { error: 'Security patrol not found' }
          }
          return { patrol }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const patrol = await prisma.securityPatrol.create({
              data: {
                project_id: body.projectId,
                route_name: body.routeName,
                patrol_date: new Date(body.patrolDate),
                start_time: body.startTime ? new Date(body.startTime) : null,
                end_time: body.endTime ? new Date(body.endTime) : null,
                status: body.status ?? 'SCHEDULED',
                guard_name: body.guardName,
                checkpoints: body.checkpoints ?? [],
                notes: body.notes,
              },
            })
            set.status = 201
            return { patrol }
          },
          { body: createPatrolSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.securityPatrol.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Security patrol not found' }
            }

            const patrol = await prisma.securityPatrol.update({
              where: { id: params.id },
              data: {
                route_name: body.routeName,
                patrol_date: body.patrolDate ? new Date(body.patrolDate) : undefined,
                start_time: body.startTime ? new Date(body.startTime) : undefined,
                end_time: body.endTime ? new Date(body.endTime) : undefined,
                status: body.status,
                guard_name: body.guardName,
                checkpoints: body.checkpoints,
                notes: body.notes,
              },
            })
            return { patrol }
          },
          { body: updatePatrolSchema },
        )
        .patch(
          '/:id/status',
          async ({ params, body, set }) => {
            const existing = await prisma.securityPatrol.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Security patrol not found' }
            }

            const patrol = await prisma.securityPatrol.update({
              where: { id: params.id },
              data: { status: body.status },
            })
            return { patrol }
          },
          {
            body: t.Object({
              status: t.Union([
                t.Literal('SCHEDULED'),
                t.Literal('IN_PROGRESS'),
                t.Literal('COMPLETED'),
                t.Literal('MISSED'),
              ]),
            }),
          },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.securityPatrol.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Security patrol not found' }
          }
          await prisma.securityPatrol.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
