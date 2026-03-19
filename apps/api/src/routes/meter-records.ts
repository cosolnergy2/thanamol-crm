import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const METER_TYPES = ['ELECTRICITY', 'WATER', 'GAS'] as const
type MeterTypeValue = (typeof METER_TYPES)[number]

const meterTypeUnion = t.Union([
  t.Literal('ELECTRICITY'),
  t.Literal('WATER'),
  t.Literal('GAS'),
])

const createMeterRecordSchema = t.Object({
  unitId: t.String({ minLength: 1 }),
  meterType: meterTypeUnion,
  previousReading: t.Number({ minimum: 0 }),
  currentReading: t.Number({ minimum: 0 }),
  readingDate: t.String({ minLength: 1 }),
  amount: t.Number({ minimum: 0 }),
  billingPeriod: t.String({ minLength: 1 }),
})

const updateMeterRecordSchema = t.Object({
  unitId: t.Optional(t.String()),
  meterType: t.Optional(meterTypeUnion),
  previousReading: t.Optional(t.Number({ minimum: 0 })),
  currentReading: t.Optional(t.Number({ minimum: 0 })),
  readingDate: t.Optional(t.String()),
  amount: t.Optional(t.Number({ minimum: 0 })),
  billingPeriod: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

function calculateUsage(previousReading: number, currentReading: number): number {
  return Math.max(0, currentReading - previousReading)
}

const meterRecordIncludes = {
  unit: {
    select: {
      id: true,
      unit_number: true,
      floor: true,
      building: true,
      project_id: true,
    },
  },
}

export const meterRecordsRoutes = new Elysia({ prefix: '/api/meter-records' })
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
            if (query.unitId) where.unit_id = query.unitId
            if (query.meterType && METER_TYPES.includes(query.meterType as MeterTypeValue)) {
              where.meter_type = query.meterType
            }
            if (query.billingPeriod) where.billing_period = query.billingPeriod

            const [total, records] = await Promise.all([
              prisma.meterRecord.count({ where }),
              prisma.meterRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { reading_date: 'desc' },
              }),
            ])

            return { data: records, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              unitId: t.Optional(t.String()),
              meterType: t.Optional(t.String()),
              billingPeriod: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const record = await prisma.meterRecord.findUnique({
            where: { id: params.id },
            include: meterRecordIncludes,
          })
          if (!record) {
            set.status = 404
            return { error: 'MeterRecord not found' }
          }
          return { meterRecord: record }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            try {
              const usage = calculateUsage(body.previousReading, body.currentReading)
              const record = await prisma.meterRecord.create({
                data: {
                  unit_id: body.unitId,
                  meter_type: body.meterType,
                  previous_reading: body.previousReading,
                  current_reading: body.currentReading,
                  reading_date: new Date(body.readingDate),
                  usage,
                  amount: body.amount,
                  billing_period: body.billingPeriod,
                },
                include: meterRecordIncludes,
              })
              logActivity({
                userId: (authUser as AuthenticatedUser).id,
                action: 'CREATE',
                entityType: 'MeterRecord',
                entityId: record.id,
                ipAddress: getIpAddress(headers),
              })
              set.status = 201
              return { meterRecord: record }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to create meter record' }
            }
          },
          { body: createMeterRecordSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.meterRecord.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'MeterRecord not found' }
            }
            try {
              const previousReading = body.previousReading ?? existing.previous_reading
              const currentReading = body.currentReading ?? existing.current_reading
              const usage = calculateUsage(previousReading, currentReading)

              const record = await prisma.meterRecord.update({
                where: { id: params.id },
                data: {
                  ...(body.unitId !== undefined && { unit_id: body.unitId }),
                  ...(body.meterType !== undefined && { meter_type: body.meterType }),
                  ...(body.previousReading !== undefined && { previous_reading: body.previousReading }),
                  ...(body.currentReading !== undefined && { current_reading: body.currentReading }),
                  ...(body.readingDate !== undefined && { reading_date: new Date(body.readingDate) }),
                  usage,
                  ...(body.amount !== undefined && { amount: body.amount }),
                  ...(body.billingPeriod !== undefined && { billing_period: body.billingPeriod }),
                },
                include: meterRecordIncludes,
              })
              logActivity({
                userId: (authUser as AuthenticatedUser).id,
                action: 'UPDATE',
                entityType: 'MeterRecord',
                entityId: params.id,
                ipAddress: getIpAddress(headers),
              })
              return { meterRecord: record }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to update meter record' }
            }
          },
          { body: updateMeterRecordSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.meterRecord.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'MeterRecord not found' }
          }
          await prisma.meterRecord.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'MeterRecord',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
