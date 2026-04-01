import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createLandscapeTaskSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  scheduledDate: t.String(),
  completedDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateLandscapeTaskSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  scheduledDate: t.Optional(t.String()),
  completedDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsLandscapeRoutes = new Elysia({ prefix: '/api/fms/landscape' })
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
            if (query.zoneId) where.zone_id = query.zoneId

            const [total, tasks] = await Promise.all([
              prisma.landscapeTask.count({ where }),
              prisma.landscapeTask.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduled_date: 'desc' },
              }),
            ])

            return { data: tasks, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const task = await prisma.landscapeTask.findUnique({
            where: { id: params.id },
          })
          if (!task) {
            set.status = 404
            return { error: 'Landscape task not found' }
          }
          return { task }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const task = await prisma.landscapeTask.create({
              data: {
                title: body.title,
                description: body.description,
                project_id: body.projectId,
                zone_id: body.zoneId,
                scheduled_date: new Date(body.scheduledDate),
                completed_date: body.completedDate ? new Date(body.completedDate) : undefined,
                status: body.status ?? 'SCHEDULED',
                assigned_to: body.assignedTo,
                notes: body.notes,
              },
            })
            set.status = 201
            return { task }
          },
          { body: createLandscapeTaskSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.landscapeTask.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Landscape task not found' }
            }

            const task = await prisma.landscapeTask.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                zone_id: body.zoneId,
                scheduled_date: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
                completed_date: body.completedDate ? new Date(body.completedDate) : undefined,
                status: body.status,
                assigned_to: body.assignedTo,
                notes: body.notes,
              },
            })
            return { task }
          },
          { body: updateLandscapeTaskSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.landscapeTask.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Landscape task not found' }
          }
          await prisma.landscapeTask.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
