import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const vqInclude = {
  purchase_request: { select: { id: true, pr_number: true, title: true } },
}

const vqItemSchema = t.Object({
  item_name: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 0.001 }),
  unit_price: t.Number({ minimum: 0 }),
  total: t.Number({ minimum: 0 }),
  lead_time_days: t.Optional(t.Number()),
})

const createVQSchema = t.Object({
  quotationNumber: t.Optional(t.String()),
  vendorName: t.String({ minLength: 1 }),
  prId: t.Optional(t.String()),
  items: t.Array(vqItemSchema),
  validUntil: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateVQSchema = t.Object({
  quotationNumber: t.Optional(t.Nullable(t.String())),
  vendorName: t.Optional(t.String({ minLength: 1 })),
  prId: t.Optional(t.Nullable(t.String())),
  items: t.Optional(t.Array(vqItemSchema)),
  validUntil: t.Optional(t.Nullable(t.String())),
  notes: t.Optional(t.Nullable(t.String())),
})

export const fmsVendorQuotationsRoutes = new Elysia({ prefix: '/api/fms/vendor-quotations' })
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
            if (query.prId) where.pr_id = query.prId
            if (query.search) {
              where.OR = [
                { vendor_name: { contains: query.search, mode: 'insensitive' } },
                { quotation_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, quotations] = await Promise.all([
              prisma.vendorQuotation.count({ where }),
              prisma.vendorQuotation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: vqInclude,
              }),
            ])

            return { data: quotations, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              prId: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const quotation = await prisma.vendorQuotation.findUnique({
            where: { id: params.id },
            include: vqInclude,
          })
          if (!quotation) {
            set.status = 404
            return { error: 'Vendor quotation not found' }
          }
          return { quotation }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const total = body.items.reduce((sum, item) => sum + item.total, 0)

            const quotation = await prisma.vendorQuotation.create({
              data: {
                quotation_number: body.quotationNumber ?? null,
                vendor_name: body.vendorName,
                pr_id: body.prId ?? null,
                items: body.items as object[],
                total,
                valid_until: body.validUntil ? new Date(body.validUntil) : null,
                notes: body.notes ?? null,
              },
              include: vqInclude,
            })

            set.status = 201
            return { quotation }
          },
          { body: createVQSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.vendorQuotation.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Vendor quotation not found' }
            }

            const items = body.items ?? (existing.items as object[])
            const typedItems = items as Array<{ total: number }>
            const total = typedItems.reduce((sum, item) => sum + item.total, 0)

            const quotation = await prisma.vendorQuotation.update({
              where: { id: params.id },
              data: {
                quotation_number: body.quotationNumber,
                vendor_name: body.vendorName,
                pr_id: body.prId,
                items: body.items as object[] | undefined,
                total,
                valid_until: body.validUntil ? new Date(body.validUntil) : undefined,
                notes: body.notes,
              },
              include: vqInclude,
            })
            return { quotation }
          },
          { body: updateVQSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.vendorQuotation.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Vendor quotation not found' }
          }

          await prisma.vendorQuotation.delete({ where: { id: params.id } })
          return { success: true }
        })
        .post('/:id/select', async ({ params, set }) => {
          const quotation = await prisma.vendorQuotation.findUnique({
            where: { id: params.id },
          })
          if (!quotation) {
            set.status = 404
            return { error: 'Vendor quotation not found' }
          }

          // Unselect all other quotations for the same PR
          if (quotation.pr_id) {
            await prisma.vendorQuotation.updateMany({
              where: { pr_id: quotation.pr_id, id: { not: params.id } },
              data: { is_selected: false },
            })
          }

          const updated = await prisma.vendorQuotation.update({
            where: { id: params.id },
            data: { is_selected: true },
            include: vqInclude,
          })
          return { quotation: updated }
        })
  )
