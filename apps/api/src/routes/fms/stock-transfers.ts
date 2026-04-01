import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateTransferNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `ST-${yearMonth}-`

  const count = await prisma.stockTransfer.count({
    where: { transfer_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const transferItemSchema = t.Object({
  itemId: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 0.001 }),
})

const createTransferSchema = t.Object({
  sourceProjectId: t.Optional(t.String()),
  destinationProjectId: t.Optional(t.String()),
  items: t.Array(transferItemSchema, { minItems: 1 }),
  transferDate: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
  transferredBy: t.Optional(t.String()),
})

const transferInclude = {
  source_project: { select: { id: true, name: true, code: true } },
  destination_project: { select: { id: true, name: true, code: true } },
  transferred_by_user: { select: { id: true, first_name: true, last_name: true } },
}

export const fmsStockTransfersRoutes = new Elysia({ prefix: '/api/fms/stock-transfers' })
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
            if (query.sourceProjectId) where.source_project_id = query.sourceProjectId
            if (query.destinationProjectId)
              where.destination_project_id = query.destinationProjectId
            if (query.search) {
              where.transfer_number = { contains: query.search, mode: 'insensitive' }
            }

            const [total, transfers] = await Promise.all([
              prisma.stockTransfer.count({ where }),
              prisma.stockTransfer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: transferInclude,
              }),
            ])

            return { data: transfers, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              sourceProjectId: t.Optional(t.String()),
              destinationProjectId: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const transfer = await prisma.stockTransfer.findUnique({
              where: { id: params.id },
              include: transferInclude,
            })
            if (!transfer) {
              set.status = 404
              return { error: 'Stock transfer not found' }
            }
            return { transfer }
          }
        )
        .post(
          '/',
          async ({ body, set }) => {
            const itemIds = body.items.map((i) => i.itemId)
            const inventoryItems = await prisma.inventoryItem.findMany({
              where: { id: { in: itemIds } },
            })

            if (inventoryItems.length !== itemIds.length) {
              const foundIds = new Set(inventoryItems.map((i) => i.id))
              const missing = itemIds.filter((id) => !foundIds.has(id))
              set.status = 404
              return { error: `Inventory items not found: ${missing.join(', ')}` }
            }

            const itemMap = new Map(inventoryItems.map((i) => [i.id, i]))
            const transferItems = body.items.map((i) => {
              const inv = itemMap.get(i.itemId)!
              return {
                item_id: i.itemId,
                item_code: inv.item_code,
                item_name: inv.name,
                quantity: i.quantity,
                unit_of_measure: inv.unit_of_measure,
              }
            })

            const transferNumber = await generateTransferNumber()
            const transferDate = new Date(body.transferDate)

            const stockMovements = body.items.flatMap((item) => [
              prisma.stockMovement.create({
                data: {
                  item_id: item.itemId,
                  movement_type: 'ISSUED',
                  quantity: item.quantity,
                  reference_type: 'STOCK_TRANSFER',
                  reference_id: transferNumber,
                  from_location: body.sourceProjectId ?? null,
                  to_location: body.destinationProjectId ?? null,
                  notes: body.notes ?? null,
                  performed_by: body.transferredBy ?? null,
                },
              }),
              prisma.stockMovement.create({
                data: {
                  item_id: item.itemId,
                  movement_type: 'RECEIVED',
                  quantity: item.quantity,
                  reference_type: 'STOCK_TRANSFER',
                  reference_id: transferNumber,
                  from_location: body.sourceProjectId ?? null,
                  to_location: body.destinationProjectId ?? null,
                  notes: body.notes ?? null,
                  performed_by: body.transferredBy ?? null,
                },
              }),
            ])

            const stockUpdates = body.items.flatMap((item) => [
              prisma.inventoryItem.update({
                where: { id: item.itemId },
                data: { current_stock: { decrement: item.quantity } },
              }),
              prisma.inventoryItem.update({
                where: { id: item.itemId },
                data: { current_stock: { increment: item.quantity } },
              }),
            ])

            const [transfer] = await prisma.$transaction([
              prisma.stockTransfer.create({
                data: {
                  transfer_number: transferNumber,
                  source_project_id: body.sourceProjectId ?? null,
                  destination_project_id: body.destinationProjectId ?? null,
                  items: transferItems,
                  transfer_date: transferDate,
                  notes: body.notes ?? null,
                  transferred_by: body.transferredBy ?? null,
                },
                include: transferInclude,
              }),
              ...stockMovements,
              ...stockUpdates,
            ])

            set.status = 201
            return { transfer }
          },
          { body: createTransferSchema }
        )
  )
