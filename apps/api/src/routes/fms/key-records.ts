import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createKeyRecordSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  keyNumber: t.String({ minLength: 1 }),
  keyType: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  issuedDate: t.Optional(t.String()),
  returnedDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateKeyRecordSchema = t.Object({
  keyNumber: t.Optional(t.String({ minLength: 1 })),
  keyType: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  issuedDate: t.Optional(t.String()),
  returnedDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsKeyRecordsRoutes = new Elysia({ prefix: '/api/fms/key-records' })
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
                { key_number: { contains: query.search, mode: 'insensitive' } },
                { assigned_to: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, keyRecords] = await Promise.all([
              prisma.keyRecord.count({ where }),
              prisma.keyRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  unit: { select: { id: true, unit_number: true } },
                  zone: { select: { id: true, name: true, code: true } },
                },
              }),
            ])

            return { data: keyRecords, pagination: buildPagination(page, limit, total) }
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
          const keyRecord = await prisma.keyRecord.findUnique({
            where: { id: params.id },
            include: {
              unit: { select: { id: true, unit_number: true } },
              zone: { select: { id: true, name: true, code: true } },
            },
          })
          if (!keyRecord) {
            set.status = 404
            return { error: 'Key record not found' }
          }
          return { keyRecord }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const keyRecord = await prisma.keyRecord.create({
              data: {
                project_id: body.projectId,
                key_number: body.keyNumber,
                key_type: body.keyType,
                assigned_to: body.assignedTo,
                unit_id: body.unitId,
                zone_id: body.zoneId,
                issued_date: body.issuedDate ? new Date(body.issuedDate) : null,
                returned_date: body.returnedDate ? new Date(body.returnedDate) : null,
                status: body.status ?? 'AVAILABLE',
                notes: body.notes,
              },
            })
            set.status = 201
            return { keyRecord }
          },
          { body: createKeyRecordSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.keyRecord.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Key record not found' }
            }

            const keyRecord = await prisma.keyRecord.update({
              where: { id: params.id },
              data: {
                key_number: body.keyNumber,
                key_type: body.keyType,
                assigned_to: body.assignedTo,
                unit_id: body.unitId,
                zone_id: body.zoneId,
                issued_date: body.issuedDate ? new Date(body.issuedDate) : undefined,
                returned_date: body.returnedDate ? new Date(body.returnedDate) : undefined,
                status: body.status,
                notes: body.notes,
              },
            })
            return { keyRecord }
          },
          { body: updateKeyRecordSchema },
        )
        .patch(
          '/:id/issue',
          async ({ params, body, set }) => {
            const existing = await prisma.keyRecord.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Key record not found' }
            }
            if (existing.status !== 'AVAILABLE') {
              set.status = 409
              return { error: 'Key is not available for issue' }
            }

            const keyRecord = await prisma.keyRecord.update({
              where: { id: params.id },
              data: {
                status: 'ISSUED',
                assigned_to: body.assignedTo,
                issued_date: new Date(),
                returned_date: null,
              },
            })
            return { keyRecord }
          },
          {
            body: t.Object({
              assignedTo: t.String({ minLength: 1 }),
            }),
          },
        )
        .patch('/:id/return', async ({ params, set }) => {
          const existing = await prisma.keyRecord.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Key record not found' }
          }
          if (existing.status !== 'ISSUED') {
            set.status = 409
            return { error: 'Key is not issued' }
          }

          const keyRecord = await prisma.keyRecord.update({
            where: { id: params.id },
            data: {
              status: 'AVAILABLE',
              returned_date: new Date(),
            },
          })
          return { keyRecord }
        })
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.keyRecord.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Key record not found' }
          }
          await prisma.keyRecord.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
