import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const HANDOVER_TYPES = ['INITIAL', 'FINAL', 'PARTIAL'] as const
type HandoverTypeValue = typeof HANDOVER_TYPES[number]

const HANDOVER_STATUSES = ['PENDING', 'COMPLETED', 'REJECTED'] as const
type HandoverStatusValue = typeof HANDOVER_STATUSES[number]

const handoverTypeUnion = t.Union([
  t.Literal('INITIAL'),
  t.Literal('FINAL'),
  t.Literal('PARTIAL'),
])

const handoverStatusUnion = t.Union([
  t.Literal('PENDING'),
  t.Literal('COMPLETED'),
  t.Literal('REJECTED'),
])

const createHandoverSchema = t.Object({
  contractId: t.String({ minLength: 1 }),
  handoverDate: t.String({ minLength: 1 }),
  handoverType: handoverTypeUnion,
  checklist: t.Optional(t.Array(t.Any())),
  notes: t.Optional(t.String()),
  status: t.Optional(handoverStatusUnion),
  receivedBy: t.Optional(t.String()),
  handedBy: t.Optional(t.String()),
})

const updateHandoverSchema = t.Object({
  handoverDate: t.Optional(t.String()),
  handoverType: t.Optional(handoverTypeUnion),
  checklist: t.Optional(t.Array(t.Any())),
  notes: t.Optional(t.String()),
  status: t.Optional(handoverStatusUnion),
  receivedBy: t.Optional(t.String()),
  handedBy: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const handoversRoutes = new Elysia({ prefix: '/api/handovers' })
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

            if (query.status && HANDOVER_STATUSES.includes(query.status as HandoverStatusValue)) {
              where.status = query.status
            }

            if (query.handoverType && HANDOVER_TYPES.includes(query.handoverType as HandoverTypeValue)) {
              where.handover_type = query.handoverType
            }

            const [total, handovers] = await Promise.all([
              prisma.handover.count({ where }),
              prisma.handover.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: handovers,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              contractId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              handoverType: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const handover = await prisma.handover.findUnique({
            where: { id: params.id },
            include: {
              contract: {
                select: { id: true, contract_number: true, type: true, status: true },
              },
              photos: true,
            },
          })
          if (!handover) {
            set.status = 404
            return { error: 'Handover not found' }
          }
          return { handover }
        })
        .post(
          '/',
          async ({ body, set, authUser, headers }) => {
            const handover = await prisma.handover.create({
              data: {
                contract_id: body.contractId,
                handover_date: new Date(body.handoverDate),
                handover_type: body.handoverType,
                checklist: (body.checklist as object[]) ?? [],
                notes: body.notes ?? null,
                status: body.status ?? 'PENDING',
                received_by: body.receivedBy ?? null,
                handed_by: body.handedBy ?? null,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Handover',
              entityId: handover.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { handover }
          },
          { body: createHandoverSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set, authUser, headers }) => {
            const existing = await prisma.handover.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Handover not found' }
            }

            const handover = await prisma.handover.update({
              where: { id: params.id },
              data: {
                handover_date: body.handoverDate ? new Date(body.handoverDate) : undefined,
                handover_type: body.handoverType,
                checklist: body.checklist !== undefined ? (body.checklist as object[]) : undefined,
                notes: body.notes,
                status: body.status,
                received_by: body.receivedBy,
                handed_by: body.handedBy,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Handover',
              entityId: handover.id,
              ipAddress: getIpAddress(headers),
            })
            return { handover }
          },
          { body: updateHandoverSchema }
        )
        .delete('/:id', async ({ params, set, authUser, headers }) => {
          const existing = await prisma.handover.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Handover not found' }
          }
          if (existing.status !== 'PENDING') {
            set.status = 409
            return { error: 'Only PENDING handovers can be deleted' }
          }
          await prisma.handover.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Handover',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
