import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createChecklistSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  checklistDate: t.String(),
  items: t.Optional(t.Array(t.Any())),
  completedBy: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateChecklistSchema = t.Object({
  zoneId: t.Optional(t.String()),
  checklistDate: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  completedBy: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsCleaningChecklistsRoutes = new Elysia({ prefix: '/api/fms/cleaning-checklists' })
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

            const [total, checklists] = await Promise.all([
              prisma.cleaningChecklist.count({ where }),
              prisma.cleaningChecklist.findMany({
                where,
                skip,
                take: limit,
                orderBy: { checklist_date: 'desc' },
                include: { zone: { select: { id: true, name: true, code: true } } },
              }),
            ])

            return { data: checklists, pagination: buildPagination(page, limit, total) }
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
          const checklist = await prisma.cleaningChecklist.findUnique({
            where: { id: params.id },
            include: { zone: true },
          })
          if (!checklist) {
            set.status = 404
            return { error: 'Cleaning checklist not found' }
          }
          return { checklist }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const checklist = await prisma.cleaningChecklist.create({
              data: {
                project_id: body.projectId,
                zone_id: body.zoneId,
                checklist_date: new Date(body.checklistDate),
                items: body.items ?? [],
                completed_by: body.completedBy,
                status: body.status ?? 'PENDING',
                notes: body.notes,
              },
            })
            set.status = 201
            return { checklist }
          },
          { body: createChecklistSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.cleaningChecklist.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Cleaning checklist not found' }
            }

            const checklist = await prisma.cleaningChecklist.update({
              where: { id: params.id },
              data: {
                zone_id: body.zoneId,
                checklist_date: body.checklistDate ? new Date(body.checklistDate) : undefined,
                items: body.items,
                completed_by: body.completedBy,
                status: body.status,
                notes: body.notes,
              },
            })
            return { checklist }
          },
          { body: updateChecklistSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.cleaningChecklist.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Cleaning checklist not found' }
          }
          await prisma.cleaningChecklist.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
