import { Elysia, t } from 'elysia'
import { Prisma } from '../../../generated/prisma/client'
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
  itemType: t.Optional(t.String()),
  barcode: t.Optional(t.String()),
  companyId: t.Optional(t.String()),
  siteId: t.Optional(t.String()),
  specifications: t.Optional(t.Unknown()),
  vendorId: t.Optional(t.String()),
  leadTimeDays: t.Optional(t.Number()),
  photos: t.Optional(t.Unknown()),
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
  itemType: t.Optional(t.String()),
  barcode: t.Optional(t.String()),
  companyId: t.Optional(t.String()),
  siteId: t.Optional(t.String()),
  specifications: t.Optional(t.Unknown()),
  vendorId: t.Optional(t.String()),
  leadTimeDays: t.Optional(t.Number()),
  photos: t.Optional(t.Unknown()),
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
                item_type: body.itemType ?? null,
                barcode: body.barcode ?? null,
                company_id: body.companyId ?? null,
                site_id: body.siteId ?? null,
                specifications: body.specifications !== undefined
                  ? (body.specifications as Prisma.InputJsonValue)
                  : Prisma.DbNull,
                vendor_id: body.vendorId ?? null,
                lead_time_days: body.leadTimeDays ?? null,
                photos: body.photos !== undefined
                  ? (body.photos as Prisma.InputJsonValue)
                  : Prisma.DbNull,
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
                item_type: body.itemType,
                barcode: body.barcode,
                company_id: body.companyId,
                site_id: body.siteId,
                specifications: body.specifications !== undefined
                  ? (body.specifications as Prisma.InputJsonValue)
                  : undefined,
                vendor_id: body.vendorId,
                lead_time_days: body.leadTimeDays,
                photos: body.photos !== undefined
                  ? (body.photos as Prisma.InputJsonValue)
                  : undefined,
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
        .post(
          '/auto-reorder',
          async ({ body, authUser, set }) => {
            const where: Record<string, unknown> = {
              is_active: true,
              reorder_point: { not: null },
            }
            if (body.projectId) where.project_id = body.projectId

            const items = await prisma.inventoryItem.findMany({ where })
            const alertItems = items.filter(
              (item) => item.reorder_point !== null && item.current_stock <= item.reorder_point
            )

            if (alertItems.length === 0) {
              set.status = 400
              return { error: 'No items below reorder point' }
            }

            const now = new Date()
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
            const prefix = `PR-${yearMonth}-`
            const count = await prisma.purchaseRequest.count({
              where: { pr_number: { startsWith: prefix } },
            })
            const prNumber = `${prefix}${String(count + 1).padStart(4, '0')}`

            const estimatedTotal = alertItems.reduce((sum, item) => {
              const qty = item.reorder_quantity ?? 1
              const cost = item.unit_cost ?? 0
              return sum + qty * cost
            }, 0)

            const prItems = alertItems.map((item) => ({
              inventory_item_id: item.id,
              name: item.name,
              quantity: item.reorder_quantity ?? 1,
              unit_cost: item.unit_cost ?? 0,
              total_cost: (item.reorder_quantity ?? 1) * (item.unit_cost ?? 0),
            }))

            const pr = await prisma.purchaseRequest.create({
              data: {
                pr_number: prNumber,
                title: body.title ?? `Auto Reorder - ${new Date().toLocaleDateString()}`,
                status: 'DRAFT',
                requested_by: authUser!.id,
                estimated_total: estimatedTotal,
                items: prItems,
              },
              select: {
                id: true,
                pr_number: true,
                title: true,
                status: true,
                estimated_total: true,
                created_at: true,
              },
            })

            set.status = 201
            return { pr: { ...pr, created_at: pr.created_at.toISOString() }, itemCount: alertItems.length }
          },
          {
            body: t.Object({
              projectId: t.Optional(t.String()),
              title: t.Optional(t.String()),
            }),
          }
        )
  )
