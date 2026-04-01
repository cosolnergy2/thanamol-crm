import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const CALIBRATION_STATUSES = ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'OVERDUE'] as const

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const calibrationInclude = {
  asset: { select: { id: true, asset_number: true, name: true, project_id: true } },
}

async function generateCalibrationNumber(): Promise<string> {
  const latest = await prisma.calibrationRecord.findFirst({
    where: { calibration_number: { startsWith: 'CAL-' } },
    orderBy: { calibration_number: 'desc' },
    select: { calibration_number: true },
  })

  if (!latest?.calibration_number) return 'CAL-00001'

  const seq = parseInt(latest.calibration_number.replace('CAL-', ''), 10)
  return `CAL-${String(seq + 1).padStart(5, '0')}`
}

const createCalibrationSchema = t.Object({
  assetId: t.String({ minLength: 1 }),
  calibrationDate: t.String({ minLength: 1 }),
  nextCalibrationDate: t.Optional(t.String()),
  performedBy: t.Optional(t.String()),
  certificateUrl: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  calibrationNumber: t.Optional(t.String()),
  frequencyDays: t.Optional(t.Number()),
  calibrationType: t.Optional(t.String()),
  calibrationStandard: t.Optional(t.String()),
  certificateNumber: t.Optional(t.String()),
  cost: t.Optional(t.Number()),
  results: t.Optional(t.Any()),
})

const updateCalibrationSchema = t.Object({
  calibrationDate: t.Optional(t.String()),
  nextCalibrationDate: t.Optional(t.String()),
  performedBy: t.Optional(t.String()),
  certificateUrl: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  calibrationNumber: t.Optional(t.String()),
  frequencyDays: t.Optional(t.Number()),
  calibrationType: t.Optional(t.String()),
  calibrationStandard: t.Optional(t.String()),
  certificateNumber: t.Optional(t.String()),
  cost: t.Optional(t.Number()),
  results: t.Optional(t.Any()),
})

export const fmsCalibrationsRoutes = new Elysia({ prefix: '/api/fms/calibrations' })
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

            if (query.assetId) where.asset_id = query.assetId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.projectId) {
              where.asset = { project_id: query.projectId }
            }

            const [total, calibrations] = await Promise.all([
              prisma.calibrationRecord.count({ where }),
              prisma.calibrationRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { calibration_date: 'desc' },
                include: calibrationInclude,
              }),
            ])

            return { data: calibrations, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              assetId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const calibration = await prisma.calibrationRecord.findUnique({
            where: { id: params.id },
            include: calibrationInclude,
          })
          if (!calibration) {
            set.status = 404
            return { error: 'Calibration record not found' }
          }
          return { calibration }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const asset = await prisma.asset.findUnique({ where: { id: body.assetId } })
            if (!asset) {
              set.status = 404
              return { error: 'Asset not found' }
            }

            const calibrationNumber = body.calibrationNumber ?? (await generateCalibrationNumber())

            const calibration = await prisma.calibrationRecord.create({
              data: {
                asset_id: body.assetId,
                calibration_date: new Date(body.calibrationDate),
                next_calibration_date: body.nextCalibrationDate
                  ? new Date(body.nextCalibrationDate)
                  : null,
                performed_by: body.performedBy ?? null,
                certificate_url: body.certificateUrl ?? null,
                status: (body.status as typeof CALIBRATION_STATUSES[number]) ?? 'PENDING',
                notes: body.notes ?? null,
                calibration_number: calibrationNumber,
                frequency_days: body.frequencyDays ?? null,
                calibration_type: body.calibrationType ?? null,
                calibration_standard: body.calibrationStandard ?? null,
                certificate_number: body.certificateNumber ?? null,
                cost: body.cost ?? null,
                results: body.results ?? [],
              },
              include: calibrationInclude,
            })
            set.status = 201
            return { calibration }
          },
          { body: createCalibrationSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.calibrationRecord.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Calibration record not found' }
            }

            const calibration = await prisma.calibrationRecord.update({
              where: { id: params.id },
              data: {
                calibration_date: body.calibrationDate
                  ? new Date(body.calibrationDate)
                  : undefined,
                next_calibration_date: body.nextCalibrationDate
                  ? new Date(body.nextCalibrationDate)
                  : undefined,
                performed_by: body.performedBy,
                certificate_url: body.certificateUrl,
                status: body.status as typeof CALIBRATION_STATUSES[number] | undefined,
                notes: body.notes,
                frequency_days: body.frequencyDays,
                calibration_type: body.calibrationType,
                calibration_standard: body.calibrationStandard,
                certificate_number: body.certificateNumber,
                cost: body.cost,
                results: body.results,
              },
              include: calibrationInclude,
            })
            return { calibration }
          },
          { body: updateCalibrationSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.calibrationRecord.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Calibration record not found' }
          }

          await prisma.calibrationRecord.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
