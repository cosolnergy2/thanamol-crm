import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'
import type { StockMovementType } from '../../../generated/prisma'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const MOVEMENT_TYPES = ['RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTED', 'TRANSFERRED'] as const

const createMovementSchema = t.Object({
  itemId: t.String({ minLength: 1 }),
  movementType: t.String(),
  quantity: t.Number({ minimum: 0.001 }),
  referenceType: t.Optional(t.String()),
  referenceId: t.Optional(t.String()),
  fromLocation: t.Optional(t.String()),
  toLocation: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  performedBy: t.Optional(t.String()),
})

export const fmsStockMovementsRoutes = new Elysia({
  prefix: '/api/fms/stock-movements',
})
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
            if (query.itemId) where.item_id = query.itemId
            if (query.movementType && query.movementType !== 'all') {
              where.movement_type = query.movementType
            }

            const [total, movements] = await Promise.all([
              prisma.stockMovement.count({ where }),
              prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  item: { select: { id: true, item_code: true, name: true } },
                  performer: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return { data: movements, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              itemId: t.Optional(t.String()),
              movementType: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/',
          async ({ body, set }) => {
            if (!MOVEMENT_TYPES.includes(body.movementType as typeof MOVEMENT_TYPES[number])) {
              set.status = 400
              return { error: `Invalid movement type. Must be one of: ${MOVEMENT_TYPES.join(', ')}` }
            }

            const item = await prisma.inventoryItem.findUnique({ where: { id: body.itemId } })
            if (!item) {
              set.status = 404
              return { error: 'Inventory item not found' }
            }

            const movementType = body.movementType as StockMovementType

            const [movement] = await prisma.$transaction([
              prisma.stockMovement.create({
                data: {
                  item_id: body.itemId,
                  movement_type: movementType,
                  quantity: body.quantity,
                  reference_type: body.referenceType ?? null,
                  reference_id: body.referenceId ?? null,
                  from_location: body.fromLocation ?? null,
                  to_location: body.toLocation ?? null,
                  notes: body.notes ?? null,
                  performed_by: body.performedBy ?? null,
                },
                include: {
                  item: { select: { id: true, item_code: true, name: true } },
                  performer: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
              prisma.inventoryItem.update({
                where: { id: body.itemId },
                data: {
                  current_stock: {
                    increment:
                      movementType === 'RECEIVED' || movementType === 'RETURNED'
                        ? body.quantity
                        : -body.quantity,
                  },
                },
              }),
            ])

            set.status = 201
            return { movement }
          },
          { body: createMovementSchema }
        )
  )
