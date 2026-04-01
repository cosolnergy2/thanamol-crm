import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createWasteRecordSchema = t.Object({
  recordDate: t.String(),
  projectId: t.String({ minLength: 1 }),
  wasteType: t.String({ minLength: 1 }),
  volume: t.Number({ minimum: 0 }),
  unit: t.String({ minLength: 1 }),
  disposalMethod: t.Optional(t.String()),
  vendorId: t.Optional(t.String()),
  cost: t.Optional(t.Number({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

const updateWasteRecordSchema = t.Object({
  recordDate: t.Optional(t.String()),
  wasteType: t.Optional(t.String()),
  volume: t.Optional(t.Number({ minimum: 0 })),
  unit: t.Optional(t.String()),
  disposalMethod: t.Optional(t.String()),
  vendorId: t.Optional(t.String()),
  cost: t.Optional(t.Number({ minimum: 0 })),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsWasteRoutes = new Elysia({ prefix: '/api/fms/waste' })
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
            if (query.wasteType) where.waste_type = query.wasteType

            const [total, records] = await Promise.all([
              prisma.wasteRecord.count({ where }),
              prisma.wasteRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { record_date: 'desc' },
              }),
            ])

            return { data: records, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              wasteType: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const record = await prisma.wasteRecord.findUnique({
            where: { id: params.id },
          })
          if (!record) {
            set.status = 404
            return { error: 'Waste record not found' }
          }
          return { record }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const record = await prisma.wasteRecord.create({
              data: {
                record_date: new Date(body.recordDate),
                project_id: body.projectId,
                waste_type: body.wasteType,
                volume: body.volume,
                unit: body.unit,
                disposal_method: body.disposalMethod,
                vendor_id: body.vendorId,
                cost: body.cost,
                notes: body.notes,
              },
            })
            set.status = 201
            return { record }
          },
          { body: createWasteRecordSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.wasteRecord.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Waste record not found' }
            }

            const record = await prisma.wasteRecord.update({
              where: { id: params.id },
              data: {
                record_date: body.recordDate ? new Date(body.recordDate) : undefined,
                waste_type: body.wasteType,
                volume: body.volume,
                unit: body.unit,
                disposal_method: body.disposalMethod,
                vendor_id: body.vendorId,
                cost: body.cost,
                notes: body.notes,
              },
            })
            return { record }
          },
          { body: updateWasteRecordSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.wasteRecord.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Waste record not found' }
          }
          await prisma.wasteRecord.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
