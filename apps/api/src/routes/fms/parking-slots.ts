import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createParkingSlotSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  slotNumber: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  slotType: t.Optional(t.String()),
  assignedToUnit: t.Optional(t.String()),
  vehiclePlate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  monthlyFee: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

const updateParkingSlotSchema = t.Object({
  slotNumber: t.Optional(t.String({ minLength: 1 })),
  zoneId: t.Optional(t.String()),
  slotType: t.Optional(t.String()),
  assignedToUnit: t.Optional(t.String()),
  vehiclePlate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  monthlyFee: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsParkingSlotsRoutes = new Elysia({ prefix: '/api/fms/parking-slots' })
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

            if (query.search) {
              where.OR = [{ slot_number: { contains: query.search, mode: 'insensitive' } }]
            }

            const [total, parkingSlots] = await Promise.all([
              prisma.parkingSlot.count({ where }),
              prisma.parkingSlot.findMany({
                where,
                skip,
                take: limit,
                orderBy: { slot_number: 'asc' },
                include: {
                  zone: { select: { id: true, name: true, code: true } },
                  assigned_unit: { select: { id: true, unit_number: true } },
                },
              }),
            ])

            return { data: parkingSlots, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const parkingSlot = await prisma.parkingSlot.findUnique({
            where: { id: params.id },
            include: {
              zone: { select: { id: true, name: true, code: true } },
              assigned_unit: { select: { id: true, unit_number: true } },
            },
          })
          if (!parkingSlot) {
            set.status = 404
            return { error: 'Parking slot not found' }
          }
          return { parkingSlot }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const parkingSlot = await prisma.parkingSlot.create({
              data: {
                project_id: body.projectId,
                slot_number: body.slotNumber,
                zone_id: body.zoneId,
                slot_type: body.slotType,
                assigned_to_unit: body.assignedToUnit,
                vehicle_plate: body.vehiclePlate,
                status: body.status ?? 'AVAILABLE',
                monthly_fee: body.monthlyFee,
                notes: body.notes,
              },
            })
            set.status = 201
            return { parkingSlot }
          },
          { body: createParkingSlotSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.parkingSlot.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Parking slot not found' }
            }

            const parkingSlot = await prisma.parkingSlot.update({
              where: { id: params.id },
              data: {
                slot_number: body.slotNumber,
                zone_id: body.zoneId,
                slot_type: body.slotType,
                assigned_to_unit: body.assignedToUnit,
                vehicle_plate: body.vehiclePlate,
                status: body.status,
                monthly_fee: body.monthlyFee,
                notes: body.notes,
              },
            })
            return { parkingSlot }
          },
          { body: updateParkingSlotSchema },
        )
        .patch(
          '/:id/assign',
          async ({ params, body, set }) => {
            const existing = await prisma.parkingSlot.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Parking slot not found' }
            }
            if (existing.status !== 'AVAILABLE') {
              set.status = 409
              return { error: 'Parking slot is not available' }
            }

            const parkingSlot = await prisma.parkingSlot.update({
              where: { id: params.id },
              data: {
                status: 'OCCUPIED',
                assigned_to_unit: body.unitId,
                vehicle_plate: body.vehiclePlate,
              },
            })
            return { parkingSlot }
          },
          {
            body: t.Object({
              unitId: t.Optional(t.String()),
              vehiclePlate: t.Optional(t.String()),
            }),
          },
        )
        .patch('/:id/release', async ({ params, set }) => {
          const existing = await prisma.parkingSlot.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Parking slot not found' }
          }

          const parkingSlot = await prisma.parkingSlot.update({
            where: { id: params.id },
            data: {
              status: 'AVAILABLE',
              assigned_to_unit: null,
              vehicle_plate: null,
            },
          })
          return { parkingSlot }
        })
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.parkingSlot.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Parking slot not found' }
          }
          await prisma.parkingSlot.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
