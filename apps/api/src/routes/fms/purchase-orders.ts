import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generatePONumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `PO-${yearMonth}-`

  const count = await prisma.purchaseOrder.count({
    where: { po_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const poInclude = {
  project: { select: { id: true, name: true, code: true } },
  purchase_request: { select: { id: true, pr_number: true, title: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

const poItemSchema = t.Object({
  item_name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  quantity: t.Number({ minimum: 0.001 }),
  unit_of_measure: t.Optional(t.String()),
  unit_price: t.Number({ minimum: 0 }),
  total: t.Number({ minimum: 0 }),
  item_type: t.Optional(t.String()),
  buy_or_rent: t.Optional(t.Union([t.Literal('buy'), t.Literal('rent')])),
  budget_code: t.Optional(t.String()),
  supplier: t.Optional(t.String()),
  specification: t.Optional(t.String()),
  category: t.Optional(t.String()),
  asset_id: t.Optional(t.String()),
})

const createPOSchema = t.Object({
  prId: t.Optional(t.String()),
  vendorName: t.String({ minLength: 1 }),
  projectId: t.Optional(t.String()),
  companyId: t.Optional(t.String()),
  siteId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  items: t.Array(poItemSchema, { minItems: 1 }),
  deliveryDate: t.Optional(t.String()),
  poDate: t.Optional(t.String()),
  paymentDueDate: t.Optional(t.String()),
  paymentTerms: t.Optional(t.String()),
  poType: t.Optional(t.String()),
  deliveryAddress: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  documents: t.Optional(t.Any()),
  conditions: t.Optional(t.Any()),
  createdBy: t.String({ minLength: 1 }),
})

const updatePOSchema = t.Object({
  prId: t.Optional(t.Nullable(t.String())),
  vendorName: t.Optional(t.String({ minLength: 1 })),
  projectId: t.Optional(t.Nullable(t.String())),
  companyId: t.Optional(t.Nullable(t.String())),
  siteId: t.Optional(t.Nullable(t.String())),
  unitId: t.Optional(t.Nullable(t.String())),
  items: t.Optional(t.Array(poItemSchema)),
  deliveryDate: t.Optional(t.Nullable(t.String())),
  poDate: t.Optional(t.Nullable(t.String())),
  paymentDueDate: t.Optional(t.Nullable(t.String())),
  paymentTerms: t.Optional(t.Nullable(t.String())),
  poType: t.Optional(t.Nullable(t.String())),
  deliveryAddress: t.Optional(t.Nullable(t.String())),
  notes: t.Optional(t.Nullable(t.String())),
  documents: t.Optional(t.Any()),
  conditions: t.Optional(t.Any()),
})

function calculateTotals(items: Array<{ quantity: number; unit_price: number; total: number }>) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * 0.07
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export const fmsPurchaseOrdersRoutes = new Elysia({ prefix: '/api/fms/purchase-orders' })
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
            if (query.prId) where.pr_id = query.prId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { po_number: { contains: query.search, mode: 'insensitive' } },
                { vendor_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, orders] = await Promise.all([
              prisma.purchaseOrder.count({ where }),
              prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: poInclude,
              }),
            ])

            return { data: orders, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              prId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const po = await prisma.purchaseOrder.findUnique({
            where: { id: params.id },
            include: poInclude,
          })
          if (!po) {
            set.status = 404
            return { error: 'Purchase order not found' }
          }
          return { po }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const poNumber = await generatePONumber()
            const { subtotal, tax, total } = calculateTotals(body.items)

            const po = await prisma.purchaseOrder.create({
              data: {
                po_number: poNumber,
                pr_id: body.prId ?? null,
                vendor_name: body.vendorName,
                project_id: body.projectId ?? null,
                company_id: body.companyId ?? null,
                site_id: body.siteId ?? null,
                unit_id: body.unitId ?? null,
                items: body.items as object[],
                subtotal,
                tax,
                total,
                delivery_date: body.deliveryDate ? new Date(body.deliveryDate) : null,
                po_date: body.poDate ? new Date(body.poDate) : null,
                payment_due_date: body.paymentDueDate ? new Date(body.paymentDueDate) : null,
                payment_terms: body.paymentTerms ?? null,
                po_type: body.poType ?? null,
                delivery_address: body.deliveryAddress ?? null,
                notes: body.notes ?? null,
                documents: body.documents ?? null,
                conditions: body.conditions ?? null,
                created_by: body.createdBy,
              },
              include: poInclude,
            })

            set.status = 201
            return { po }
          },
          { body: createPOSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.purchaseOrder.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Purchase order not found' }
            }

            if (existing.status !== 'DRAFT') {
              set.status = 400
              return { error: 'Only draft purchase orders can be edited' }
            }

            const items = body.items ?? (existing.items as object[])
            const typedItems = items as Array<{
              quantity: number
              unit_price: number
              total: number
            }>
            const { subtotal, tax, total } = calculateTotals(typedItems)

            const po = await prisma.purchaseOrder.update({
              where: { id: params.id },
              data: {
                pr_id: body.prId,
                vendor_name: body.vendorName,
                project_id: body.projectId,
                company_id: body.companyId,
                site_id: body.siteId,
                unit_id: body.unitId,
                items: body.items as object[] | undefined,
                subtotal,
                tax,
                total,
                delivery_date: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
                po_date: body.poDate ? new Date(body.poDate) : undefined,
                payment_due_date: body.paymentDueDate ? new Date(body.paymentDueDate) : undefined,
                payment_terms: body.paymentTerms,
                po_type: body.poType,
                delivery_address: body.deliveryAddress,
                notes: body.notes,
                documents: body.documents,
                conditions: body.conditions,
              },
              include: poInclude,
            })
            return { po }
          },
          { body: updatePOSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.purchaseOrder.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Purchase order not found' }
          }
          if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
            set.status = 400
            return { error: 'Only draft or cancelled purchase orders can be deleted' }
          }

          await prisma.purchaseOrder.delete({ where: { id: params.id } })
          return { success: true }
        })
        .post('/:id/issue', async ({ params, set }) => {
          const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } })
          if (!po) {
            set.status = 404
            return { error: 'Purchase order not found' }
          }
          if (po.status !== 'DRAFT') {
            set.status = 400
            return { error: 'Only draft purchase orders can be issued' }
          }

          const updated = await prisma.purchaseOrder.update({
            where: { id: params.id },
            data: { status: 'ISSUED' },
            include: poInclude,
          })
          return { po: updated }
        })
        .post(
          '/:id/receive',
          async ({ params, body, set }) => {
            const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } })
            if (!po) {
              set.status = 404
              return { error: 'Purchase order not found' }
            }
            if (!['ISSUED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
              set.status = 400
              return { error: 'Only issued or partially received purchase orders can be received' }
            }

            const newStatus = body.fullyReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED'

            const updated = await prisma.purchaseOrder.update({
              where: { id: params.id },
              data: { status: newStatus },
              include: poInclude,
            })
            return { po: updated }
          },
          {
            body: t.Object({
              fullyReceived: t.Optional(t.Boolean()),
              notes: t.Optional(t.String()),
            }),
          }
        )
        .post('/:id/cancel', async ({ params, set }) => {
          const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } })
          if (!po) {
            set.status = 404
            return { error: 'Purchase order not found' }
          }
          if (['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(po.status)) {
            set.status = 400
            return { error: 'Cannot cancel a fully received, closed, or already cancelled PO' }
          }

          const updated = await prisma.purchaseOrder.update({
            where: { id: params.id },
            data: { status: 'CANCELLED' },
            include: poInclude,
          })
          return { po: updated }
        })
  )
