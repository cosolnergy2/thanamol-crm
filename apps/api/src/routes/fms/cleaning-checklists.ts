import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const cleaningAreaTaskSchema = t.Object({
  task_name: t.String(),
  completed: t.Boolean(),
  quality_score: t.Number(),
})

const cleaningAreaSchema = t.Object({
  area_name: t.String(),
  tasks: t.Array(cleaningAreaTaskSchema),
})

const createChecklistSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  siteId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  checklistDate: t.String(),
  shift: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  cleaningAreas: t.Optional(t.Array(cleaningAreaSchema)),
  completedBy: t.Optional(t.String()),
  cleanerId: t.Optional(t.String()),
  supervisorId: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateChecklistSchema = t.Object({
  siteId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  checklistDate: t.Optional(t.String()),
  shift: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  cleaningAreas: t.Optional(t.Array(cleaningAreaSchema)),
  completedBy: t.Optional(t.String()),
  cleanerId: t.Optional(t.String()),
  supervisorId: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateChecklistNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.cleaningChecklist.count()
  const sequence = String(count + 1).padStart(5, '0')
  return `CC-${year}-${sequence}`
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
            const checklistNumber = await generateChecklistNumber()
            const checklist = await prisma.cleaningChecklist.create({
              data: {
                checklist_number: checklistNumber,
                project_id: body.projectId,
                site_id: body.siteId,
                zone_id: body.zoneId,
                checklist_date: new Date(body.checklistDate),
                shift: body.shift,
                items: body.items ?? [],
                cleaning_areas: body.cleaningAreas ?? [],
                completed_by: body.completedBy,
                cleaner_id: body.cleanerId,
                supervisor_id: body.supervisorId,
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
                site_id: body.siteId,
                zone_id: body.zoneId,
                checklist_date: body.checklistDate ? new Date(body.checklistDate) : undefined,
                shift: body.shift,
                items: body.items,
                cleaning_areas: body.cleaningAreas,
                completed_by: body.completedBy,
                cleaner_id: body.cleanerId,
                supervisor_id: body.supervisorId,
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
