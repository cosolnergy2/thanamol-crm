import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateItemCode(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yearMonth}-`

  const count = await prisma.inventoryItem.count({
    where: { item_code: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const inventoryInclude = {
  category: true,
  project: { select: { id: true, name: true, code: true } },
}

const createItemSchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  unitOfMeasure: t.Optional(t.String()),
  minimumStock: t.Optional(t.Number()),
  maximumStock: t.Optional(t.Number()),
  reorderPoint: t.Optional(t.Number()),
  reorderQuantity: t.Optional(t.Number()),
  unitCost: t.Optional(t.Number()),
  storageLocation: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
})

const updateItemSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  unitOfMeasure: t.Optional(t.String()),
  minimumStock: t.Optional(t.Number()),
  maximumStock: t.Optional(t.Number()),
  reorderPoint: t.Optional(t.Number()),
  reorderQuantity: t.Optional(t.Number()),
  unitCost: t.Optional(t.Number()),
  storageLocation: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  isActive: t.Optional(t.Boolean()),
})

export const fmsInventoryRoutes = new Elysia({ prefix: '/api/fms/inventory' })
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

            if (query.projectId) where.project_id = query.projectId
            if (query.categoryId) where.category_id = query.categoryId
            if (query.isActive !== undefined) where.is_active = query.isActive === 'true'
            // lowStock filtering happens post-query (raw SQL would be more efficient but this is simpler)
            // We'll fetch all and filter in the reorder-alerts endpoint instead
            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { item_code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, items] = await Promise.all([
              prisma.inventoryItem.count({ where }),
              prisma.inventoryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: inventoryInclude,
              }),
            ])

            return { data: items, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              categoryId: t.Optional(t.String()),
              lowStock: t.Optional(t.String()),
              search: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const item = await prisma.inventoryItem.findUnique({
            where: { id: params.id },
            include: {
              ...inventoryInclude,
              stock_movements: {
                orderBy: { created_at: 'desc' },
                take: 50,
                include: {
                  performer: { select: { id: true, first_name: true, last_name: true } },
                },
              },
            },
          })
          if (!item) {
            set.status = 404
            return { error: 'Inventory item not found' }
          }
          return { item }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const itemCode = await generateItemCode()

            const item = await prisma.inventoryItem.create({
              data: {
                item_code: itemCode,
                name: body.name,
                description: body.description ?? null,
                category_id: body.categoryId ?? null,
                unit_of_measure: body.unitOfMeasure ?? null,
                minimum_stock: body.minimumStock ?? null,
                maximum_stock: body.maximumStock ?? null,
                reorder_point: body.reorderPoint ?? null,
                reorder_quantity: body.reorderQuantity ?? null,
                unit_cost: body.unitCost ?? null,
                storage_location: body.storageLocation ?? null,
                project_id: body.projectId ?? null,
              },
              include: inventoryInclude,
            })
            set.status = 201
            return { item }
          },
          { body: createItemSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.inventoryItem.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Inventory item not found' }
            }

            const item = await prisma.inventoryItem.update({
              where: { id: params.id },
              data: {
                name: body.name,
                description: body.description,
                category_id: body.categoryId,
                unit_of_measure: body.unitOfMeasure,
                minimum_stock: body.minimumStock,
                maximum_stock: body.maximumStock,
                reorder_point: body.reorderPoint,
                reorder_quantity: body.reorderQuantity,
                unit_cost: body.unitCost,
                storage_location: body.storageLocation,
                project_id: body.projectId,
                is_active: body.isActive,
              },
              include: inventoryInclude,
            })
            return { item }
          },
          { body: updateItemSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } })
          if (!item) {
            set.status = 404
            return { error: 'Inventory item not found' }
          }

          await prisma.inventoryItem.delete({ where: { id: params.id } })
          return { success: true }
        })
        .get('/reorder-alerts/list', async ({ query }) => {
          const where: Record<string, unknown> = {
            is_active: true,
            reorder_point: { not: null },
          }
          if (query.projectId) where.project_id = query.projectId

          const items = await prisma.inventoryItem.findMany({
            where,
            include: inventoryInclude,
            orderBy: { current_stock: 'asc' },
          })

          const alerts = items.filter(
            (item) => item.reorder_point !== null && item.current_stock <= item.reorder_point
          )

          return { data: alerts }
        }, {
          query: t.Object({
            projectId: t.Optional(t.String()),
          }),
        })
  )
