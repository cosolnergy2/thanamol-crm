import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createZoneSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  code: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  floor: t.Optional(t.String()),
  building: t.Optional(t.String()),
  parentZoneId: t.Optional(t.String()),
})

const updateZoneSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  code: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  floor: t.Optional(t.String()),
  building: t.Optional(t.String()),
  parentZoneId: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const fmsZonesRoutes = new Elysia({ prefix: '/api/fms/zones' })
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
          async ({ query, set }) => {
            if (!query.projectId) {
              set.status = 400
              return { error: 'projectId is required' }
            }

            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = { project_id: query.projectId }

            if (query.parentZoneId !== undefined) {
              where.parent_zone_id = query.parentZoneId === '' ? null : query.parentZoneId
            }

            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, zones] = await Promise.all([
              prisma.zone.count({ where }),
              prisma.zone.findMany({
                where,
                skip,
                take: limit,
                orderBy: { code: 'asc' },
                include: {
                  _count: { select: { children: true, units: true } },
                },
              }),
            ])

            return {
              data: zones,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              parentZoneId: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const zone = await prisma.zone.findUnique({
            where: { id: params.id },
            include: {
              children: {
                orderBy: { code: 'asc' },
                include: { _count: { select: { children: true, units: true } } },
              },
              parent_zone: true,
              _count: { select: { units: true } },
            },
          })
          if (!zone) {
            set.status = 404
            return { error: 'Zone not found' }
          }
          return { zone }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const existing = await prisma.zone.findUnique({
              where: { project_id_code: { project_id: body.projectId, code: body.code } },
            })
            if (existing) {
              set.status = 409
              return { error: 'A zone with this code already exists in the project' }
            }

            const zone = await prisma.zone.create({
              data: {
                project_id: body.projectId,
                name: body.name,
                code: body.code,
                description: body.description,
                floor: body.floor,
                building: body.building,
                parent_zone_id: body.parentZoneId,
              },
            })
            set.status = 201
            return { zone }
          },
          { body: createZoneSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.zone.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Zone not found' }
            }

            if (body.code && body.code !== existing.code) {
              const codeConflict = await prisma.zone.findUnique({
                where: { project_id_code: { project_id: existing.project_id, code: body.code } },
              })
              if (codeConflict) {
                set.status = 409
                return { error: 'A zone with this code already exists in the project' }
              }
            }

            const zone = await prisma.zone.update({
              where: { id: params.id },
              data: {
                name: body.name,
                code: body.code,
                description: body.description,
                floor: body.floor,
                building: body.building,
                parent_zone_id: body.parentZoneId,
              },
            })
            return { zone }
          },
          { body: updateZoneSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const zone = await prisma.zone.findUnique({
            where: { id: params.id },
            include: { _count: { select: { children: true, units: true } } },
          })
          if (!zone) {
            set.status = 404
            return { error: 'Zone not found' }
          }
          if (zone._count.children > 0) {
            set.status = 409
            return { error: 'Cannot delete zone with sub-zones. Remove sub-zones first.' }
          }
          if (zone._count.units > 0) {
            set.status = 409
            return { error: 'Cannot delete zone with assigned units. Unassign units first.' }
          }

          await prisma.zone.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
