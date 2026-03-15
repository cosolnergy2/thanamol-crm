import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const INSPECTION_STATUSES = ['PASS', 'FAIL', 'CONDITIONAL'] as const
type InspectionStatusValue = typeof INSPECTION_STATUSES[number]

const inspectionStatusUnion = t.Union([
  t.Literal('PASS'),
  t.Literal('FAIL'),
  t.Literal('CONDITIONAL'),
])

const createPreHandoverInspectionSchema = t.Object({
  contractId: t.String({ minLength: 1 }),
  inspectionDate: t.String({ minLength: 1 }),
  inspector: t.String({ minLength: 1 }),
  items: t.Optional(t.Array(t.Any())),
  overallStatus: t.Optional(inspectionStatusUnion),
  notes: t.Optional(t.String()),
  photos: t.Optional(t.Array(t.Any())),
})

const updatePreHandoverInspectionSchema = t.Object({
  inspectionDate: t.Optional(t.String()),
  inspector: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  overallStatus: t.Optional(inspectionStatusUnion),
  notes: t.Optional(t.String()),
  photos: t.Optional(t.Array(t.Any())),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const preHandoverInspectionsRoutes = new Elysia({ prefix: '/api/pre-handover-inspections' })
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

            if (query.contractId) {
              where.contract_id = query.contractId
            }

            if (
              query.status &&
              INSPECTION_STATUSES.includes(query.status as InspectionStatusValue)
            ) {
              where.overall_status = query.status
            }

            const [total, inspections] = await Promise.all([
              prisma.preHandoverInspection.count({ where }),
              prisma.preHandoverInspection.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: inspections,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              contractId: t.Optional(t.String()),
              status: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const inspection = await prisma.preHandoverInspection.findUnique({
            where: { id: params.id },
            include: {
              contract: {
                select: { id: true, contract_number: true, type: true, status: true },
              },
            },
          })
          if (!inspection) {
            set.status = 404
            return { error: 'Pre-handover inspection not found' }
          }
          return { inspection }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const inspection = await prisma.preHandoverInspection.create({
              data: {
                contract_id: body.contractId,
                inspection_date: new Date(body.inspectionDate),
                inspector: body.inspector,
                items: (body.items as object[]) ?? [],
                overall_status: body.overallStatus ?? 'CONDITIONAL',
                notes: body.notes ?? null,
                photos: (body.photos as object[]) ?? [],
              },
            })
            set.status = 201
            return { inspection }
          },
          { body: createPreHandoverInspectionSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.preHandoverInspection.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Pre-handover inspection not found' }
            }

            const inspection = await prisma.preHandoverInspection.update({
              where: { id: params.id },
              data: {
                inspection_date: body.inspectionDate
                  ? new Date(body.inspectionDate)
                  : undefined,
                inspector: body.inspector,
                items: body.items !== undefined ? (body.items as object[]) : undefined,
                overall_status: body.overallStatus,
                notes: body.notes,
                photos: body.photos !== undefined ? (body.photos as object[]) : undefined,
              },
            })
            return { inspection }
          },
          { body: updatePreHandoverInspectionSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.preHandoverInspection.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Pre-handover inspection not found' }
          }
          await prisma.preHandoverInspection.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
