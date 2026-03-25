import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const FIRE_EQUIPMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'] as const

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const createFireEquipmentSchema = t.Object({
  equipmentNumber: t.String({ minLength: 1 }),
  type: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
  lastInspectionDate: t.Optional(t.String()),
  nextInspectionDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateFireEquipmentSchema = t.Object({
  equipmentNumber: t.Optional(t.String({ minLength: 1 })),
  type: t.Optional(t.String({ minLength: 1 })),
  zoneId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
  lastInspectionDate: t.Optional(t.String()),
  nextInspectionDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const fireEquipmentInclude = {
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true } },
}

export const fmsFireEquipmentRoutes = new Elysia({ prefix: '/api/fms/fire-equipment' })
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
            if (query.zoneId) where.zone_id = query.zoneId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { equipment_number: { contains: query.search, mode: 'insensitive' } },
                { type: { contains: query.search, mode: 'insensitive' } },
                { location_detail: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, equipment] = await Promise.all([
              prisma.fireEquipment.count({ where }),
              prisma.fireEquipment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: fireEquipmentInclude,
              }),
            ])

            return { data: equipment, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const equipment = await prisma.fireEquipment.findUnique({
            where: { id: params.id },
            include: fireEquipmentInclude,
          })
          if (!equipment) {
            set.status = 404
            return { error: 'Fire equipment not found' }
          }
          return { equipment }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const equipment = await prisma.fireEquipment.create({
              data: {
                equipment_number: body.equipmentNumber,
                type: body.type,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                location_detail: body.locationDetail ?? null,
                last_inspection_date: body.lastInspectionDate
                  ? new Date(body.lastInspectionDate)
                  : null,
                next_inspection_date: body.nextInspectionDate
                  ? new Date(body.nextInspectionDate)
                  : null,
                status: body.status ?? 'ACTIVE',
                notes: body.notes ?? null,
              },
              include: fireEquipmentInclude,
            })
            set.status = 201
            return { equipment }
          },
          { body: createFireEquipmentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.fireEquipment.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Fire equipment not found' }
            }

            const equipment = await prisma.fireEquipment.update({
              where: { id: params.id },
              data: {
                ...(body.equipmentNumber !== undefined && {
                  equipment_number: body.equipmentNumber,
                }),
                ...(body.type !== undefined && { type: body.type }),
                ...(body.zoneId !== undefined && { zone_id: body.zoneId ?? null }),
                ...(body.locationDetail !== undefined && {
                  location_detail: body.locationDetail ?? null,
                }),
                ...(body.lastInspectionDate !== undefined && {
                  last_inspection_date: body.lastInspectionDate
                    ? new Date(body.lastInspectionDate)
                    : null,
                }),
                ...(body.nextInspectionDate !== undefined && {
                  next_inspection_date: body.nextInspectionDate
                    ? new Date(body.nextInspectionDate)
                    : null,
                }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.notes !== undefined && { notes: body.notes ?? null }),
              },
              include: fireEquipmentInclude,
            })
            return { equipment }
          },
          { body: updateFireEquipmentSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.fireEquipment.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Fire equipment not found' }
          }
          await prisma.fireEquipment.delete({ where: { id: params.id } })
          return { success: true }
        })
  )

export { FIRE_EQUIPMENT_STATUSES }
