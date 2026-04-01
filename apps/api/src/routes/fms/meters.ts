import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const METER_TYPES = ['ELECTRICITY', 'WATER', 'GAS'] as const
type FmsMeterTypeValue = (typeof METER_TYPES)[number]

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const meterTypeUnion = t.Union([
  t.Literal('ELECTRICITY'),
  t.Literal('WATER'),
  t.Literal('GAS'),
])

const createMeterReadingSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  meterType: meterTypeUnion,
  location: t.Optional(t.String()),
  readingDate: t.String({ minLength: 1 }),
  value: t.Number({ minimum: 0 }),
  previousValue: t.Optional(t.Number({ minimum: 0 })),
  unit: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
})

const updateMeterReadingSchema = t.Object({
  meterType: t.Optional(meterTypeUnion),
  location: t.Optional(t.String()),
  readingDate: t.Optional(t.String()),
  value: t.Optional(t.Number({ minimum: 0 })),
  previousValue: t.Optional(t.Number({ minimum: 0 })),
  unit: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const createUtilityRateSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  meterType: meterTypeUnion,
  tierName: t.String({ minLength: 1 }),
  minUsage: t.Number({ minimum: 0 }),
  maxUsage: t.Optional(t.Number({ minimum: 0 })),
  ratePerUnit: t.Number({ minimum: 0 }),
})

const updateUtilityRateSchema = t.Object({
  meterType: t.Optional(meterTypeUnion),
  tierName: t.Optional(t.String({ minLength: 1 })),
  minUsage: t.Optional(t.Number({ minimum: 0 })),
  maxUsage: t.Optional(t.Number({ minimum: 0 })),
  ratePerUnit: t.Optional(t.Number({ minimum: 0 })),
})

const meterReadingInclude = {
  project: { select: { id: true, name: true, code: true } },
}

function calculateConsumption(value: number, previousValue: number | null): number {
  if (previousValue === null || previousValue === undefined) return value
  return Math.max(0, value - previousValue)
}

function calculateCharge(
  consumption: number,
  rates: Array<{ min_usage: number; max_usage: number | null; rate_per_unit: number }>,
): number {
  let totalCharge = 0
  let remaining = consumption

  const sortedRates = [...rates].sort((a, b) => a.min_usage - b.min_usage)

  for (const rate of sortedRates) {
    if (remaining <= 0) break
    const tierMin = rate.min_usage
    const tierMax = rate.max_usage ?? Infinity
    const tierCapacity = tierMax - tierMin
    const usageInTier = Math.min(remaining, tierCapacity)
    totalCharge += usageInTier * rate.rate_per_unit
    remaining -= usageInTier
  }

  if (remaining > 0 && sortedRates.length > 0) {
    const lastRate = sortedRates[sortedRates.length - 1]
    totalCharge += remaining * lastRate.rate_per_unit
  }

  return totalCharge
}

export const fmsMetersRoutes = new Elysia({ prefix: '/api/fms/meters' })
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
        // ─── Meter Readings ───────────────────────────────────────────────────
        .get(
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.meterType && METER_TYPES.includes(query.meterType as FmsMeterTypeValue)) {
              where.meter_type = query.meterType
            }

            const [total, records] = await Promise.all([
              prisma.fmsMeterRecord.count({ where }),
              prisma.fmsMeterRecord.findMany({
                where,
                skip,
                take: limit,
                include: meterReadingInclude,
                orderBy: { reading_date: 'desc' },
              }),
            ])

            return { data: records, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              meterType: t.Optional(t.String()),
            }),
          },
        )
        .get('/revenue', async ({ query, set }) => {
          if (!query.projectId) {
            set.status = 400
            return { error: 'projectId is required' }
          }

          const where: Record<string, unknown> = { project_id: query.projectId }
          if (query.meterType && METER_TYPES.includes(query.meterType as FmsMeterTypeValue)) {
            where.meter_type = query.meterType
          }

          const [readings, rates] = await Promise.all([
            prisma.fmsMeterRecord.findMany({
              where,
              orderBy: { reading_date: 'desc' },
            }),
            prisma.utilityRate.findMany({
              where: { project_id: query.projectId },
            }),
          ])

          const ratesByType = rates.reduce<Record<string, typeof rates>>(
            (acc, rate) => {
              const key = rate.meter_type
              if (!acc[key]) acc[key] = []
              acc[key].push(rate)
              return acc
            },
            {},
          )

          const revenueRows = readings.map((reading) => {
            const consumption = calculateConsumption(reading.value, reading.previous_value)
            const typeRates = ratesByType[reading.meter_type] ?? []
            const charge = calculateCharge(consumption, typeRates)
            return {
              id: reading.id,
              meterType: reading.meter_type,
              location: reading.location,
              readingDate: reading.reading_date.toISOString(),
              value: reading.value,
              previousValue: reading.previous_value,
              unit: reading.unit,
              consumption,
              charge,
            }
          })

          const totalCharge = revenueRows.reduce((sum, r) => sum + r.charge, 0)

          return { data: revenueRows, totalCharge }
        },
        {
          query: t.Object({
            projectId: t.Optional(t.String()),
            meterType: t.Optional(t.String()),
          }),
        })
        .get('/:id', async ({ params, set }) => {
          const record = await prisma.fmsMeterRecord.findUnique({
            where: { id: params.id },
            include: meterReadingInclude,
          })
          if (!record) {
            set.status = 404
            return { error: 'Meter reading not found' }
          }
          return { meterReading: record }
        })
        .post(
          '/',
          async ({ body, set }) => {
            try {
              const record = await prisma.fmsMeterRecord.create({
                data: {
                  project_id: body.projectId,
                  meter_type: body.meterType,
                  location: body.location ?? '',
                  reading_date: new Date(body.readingDate),
                  value: body.value,
                  previous_value: body.previousValue ?? 0,
                  unit: body.unit,
                  notes: body.notes ?? null,
                },
                include: meterReadingInclude,
              })
              set.status = 201
              return { meterReading: record }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to create meter reading' }
            }
          },
          { body: createMeterReadingSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.fmsMeterRecord.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Meter reading not found' }
            }
            try {
              const record = await prisma.fmsMeterRecord.update({
                where: { id: params.id },
                data: {
                  ...(body.meterType !== undefined && { meter_type: body.meterType }),
                  ...(body.location !== undefined && { location: body.location }),
                  ...(body.readingDate !== undefined && { reading_date: new Date(body.readingDate) }),
                  ...(body.value !== undefined && { value: body.value }),
                  ...(body.previousValue !== undefined && { previous_value: body.previousValue }),
                  ...(body.unit !== undefined && { unit: body.unit }),
                  ...(body.notes !== undefined && { notes: body.notes }),
                },
                include: meterReadingInclude,
              })
              return { meterReading: record }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to update meter reading' }
            }
          },
          { body: updateMeterReadingSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.fmsMeterRecord.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Meter reading not found' }
          }
          await prisma.fmsMeterRecord.delete({ where: { id: params.id } })
          return { success: true }
        })
        // ─── Utility Rates ────────────────────────────────────────────────────
        .get(
          '/rates',
          async ({ query }) => {
            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.meterType && METER_TYPES.includes(query.meterType as FmsMeterTypeValue)) {
              where.meter_type = query.meterType
            }

            const rates = await prisma.utilityRate.findMany({
              where,
              orderBy: [{ meter_type: 'asc' }, { min_usage: 'asc' }],
            })

            return { data: rates }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              meterType: t.Optional(t.String()),
            }),
          },
        )
        .get('/rates/:id', async ({ params, set }) => {
          const rate = await prisma.utilityRate.findUnique({ where: { id: params.id } })
          if (!rate) {
            set.status = 404
            return { error: 'Utility rate not found' }
          }
          return { utilityRate: rate }
        })
        .post(
          '/rates',
          async ({ body, set }) => {
            try {
              const rate = await prisma.utilityRate.create({
                data: {
                  project_id: body.projectId,
                  meter_type: body.meterType,
                  tier_name: body.tierName,
                  min_usage: body.minUsage,
                  max_usage: body.maxUsage ?? 0,
                  rate_per_unit: body.ratePerUnit,
                },
              })
              set.status = 201
              return { utilityRate: rate }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to create utility rate' }
            }
          },
          { body: createUtilityRateSchema },
        )
        .put(
          '/rates/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.utilityRate.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Utility rate not found' }
            }
            try {
              const rate = await prisma.utilityRate.update({
                where: { id: params.id },
                data: {
                  ...(body.meterType !== undefined && { meter_type: body.meterType }),
                  ...(body.tierName !== undefined && { tier_name: body.tierName }),
                  ...(body.minUsage !== undefined && { min_usage: body.minUsage }),
                  ...(body.maxUsage !== undefined && { max_usage: body.maxUsage }),
                  ...(body.ratePerUnit !== undefined && { rate_per_unit: body.ratePerUnit }),
                },
              })
              return { utilityRate: rate }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to update utility rate' }
            }
          },
          { body: updateUtilityRateSchema },
        )
        .delete('/rates/:id', async ({ params, set }) => {
          const existing = await prisma.utilityRate.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Utility rate not found' }
          }
          await prisma.utilityRate.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
