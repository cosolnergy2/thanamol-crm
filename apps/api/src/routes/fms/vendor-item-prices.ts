import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const createPriceSchema = t.Object({
  vendorId: t.String({ minLength: 1 }),
  itemName: t.String({ minLength: 1 }),
  itemCode: t.Optional(t.String()),
  unitPrice: t.Number({ minimum: 0 }),
  currency: t.Optional(t.String()),
  validFrom: t.Optional(t.String()),
  validUntil: t.Optional(t.String()),
  isActive: t.Optional(t.Boolean()),
})

const updatePriceSchema = t.Object({
  itemName: t.Optional(t.String({ minLength: 1 })),
  itemCode: t.Optional(t.Nullable(t.String())),
  unitPrice: t.Optional(t.Number({ minimum: 0 })),
  currency: t.Optional(t.String()),
  validFrom: t.Optional(t.Nullable(t.String())),
  validUntil: t.Optional(t.Nullable(t.String())),
  isActive: t.Optional(t.Boolean()),
})

export const fmsVendorItemPricesRoutes = new Elysia({ prefix: '/api/fms/vendor-item-prices' })
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
            if (query.vendorId) where.vendor_id = query.vendorId
            if (query.isActive !== undefined) where.is_active = query.isActive === 'true'
            if (query.search) {
              where.OR = [
                { item_name: { contains: query.search, mode: 'insensitive' } },
                { item_code: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [data, total] = await Promise.all([
              prisma.vendorItemPrice.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
              }),
              prisma.vendorItemPrice.count({ where }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              vendorId: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const price = await prisma.vendorItemPrice.findUnique({ where: { id: params.id } })

            if (!price) {
              set.status = 404
              return { error: 'Item price not found' }
            }

            return { price }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/',
          async ({ body, set }) => {
            const vendorExists = await prisma.vendor.findUnique({ where: { id: body.vendorId } })
            if (!vendorExists) {
              set.status = 404
              return { error: 'Vendor not found' }
            }

            const price = await prisma.vendorItemPrice.create({
              data: {
                vendor_id: body.vendorId,
                item_name: body.itemName,
                item_code: body.itemCode,
                unit_price: body.unitPrice,
                currency: body.currency ?? 'THB',
                valid_from: body.validFrom ? new Date(body.validFrom) : null,
                valid_until: body.validUntil ? new Date(body.validUntil) : null,
                is_active: body.isActive ?? true,
              },
            })

            set.status = 201
            return { price }
          },
          { body: createPriceSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.vendorItemPrice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Item price not found' }
            }

            const price = await prisma.vendorItemPrice.update({
              where: { id: params.id },
              data: {
                ...(body.itemName !== undefined && { item_name: body.itemName }),
                ...(body.itemCode !== undefined && { item_code: body.itemCode }),
                ...(body.unitPrice !== undefined && { unit_price: body.unitPrice }),
                ...(body.currency !== undefined && { currency: body.currency }),
                ...(body.validFrom !== undefined && {
                  valid_from: body.validFrom ? new Date(body.validFrom) : null,
                }),
                ...(body.validUntil !== undefined && {
                  valid_until: body.validUntil ? new Date(body.validUntil) : null,
                }),
                ...(body.isActive !== undefined && { is_active: body.isActive }),
              },
            })

            return { price }
          },
          {
            params: t.Object({ id: t.String() }),
            body: updatePriceSchema,
          }
        )
        .delete(
          '/:id',
          async ({ params, set }) => {
            const existing = await prisma.vendorItemPrice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Item price not found' }
            }

            await prisma.vendorItemPrice.delete({ where: { id: params.id } })
            return { success: true }
          },
          { params: t.Object({ id: t.String() }) }
        )
  )
