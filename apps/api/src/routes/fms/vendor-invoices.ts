import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const invoiceInclude = {
  vendor: { select: { id: true, vendor_code: true, name: true } },
}

const invoiceItemSchema = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 0.001 }),
  unit_price: t.Number({ minimum: 0 }),
  total: t.Number({ minimum: 0 }),
})

const createInvoiceSchema = t.Object({
  invoiceNumber: t.String({ minLength: 1 }),
  vendorId: t.String({ minLength: 1 }),
  poId: t.Optional(t.String()),
  items: t.Array(invoiceItemSchema, { minItems: 1 }),
  subtotal: t.Number({ minimum: 0 }),
  tax: t.Number({ minimum: 0 }),
  total: t.Number({ minimum: 0 }),
  invoiceDate: t.String({ minLength: 1 }),
  dueDate: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateInvoiceSchema = t.Object({
  invoiceNumber: t.Optional(t.String({ minLength: 1 })),
  poId: t.Optional(t.Nullable(t.String())),
  items: t.Optional(t.Array(invoiceItemSchema)),
  subtotal: t.Optional(t.Number({ minimum: 0 })),
  tax: t.Optional(t.Number({ minimum: 0 })),
  total: t.Optional(t.Number({ minimum: 0 })),
  invoiceDate: t.Optional(t.String()),
  dueDate: t.Optional(t.Nullable(t.String())),
  notes: t.Optional(t.Nullable(t.String())),
})

export const fmsVendorInvoicesRoutes = new Elysia({ prefix: '/api/fms/vendor-invoices' })
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
            if (query.vendorId) where.vendor_id = query.vendorId
            if (query.paymentStatus) where.payment_status = query.paymentStatus
            if (query.search) {
              where.OR = [
                { invoice_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [data, total] = await Promise.all([
              prisma.vendorInvoice.findMany({
                where,
                include: invoiceInclude,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
              }),
              prisma.vendorInvoice.count({ where }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              vendorId: t.Optional(t.String()),
              paymentStatus: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const invoice = await prisma.vendorInvoice.findUnique({
              where: { id: params.id },
              include: invoiceInclude,
            })

            if (!invoice) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            return { invoice }
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

            const invoice = await prisma.vendorInvoice.create({
              data: {
                invoice_number: body.invoiceNumber,
                vendor_id: body.vendorId,
                po_id: body.poId,
                items: body.items as object[],
                subtotal: body.subtotal,
                tax: body.tax,
                total: body.total,
                invoice_date: new Date(body.invoiceDate),
                due_date: body.dueDate ? new Date(body.dueDate) : null,
                payment_status: 'PENDING',
                notes: body.notes,
              },
              include: invoiceInclude,
            })

            set.status = 201
            return { invoice }
          },
          { body: createInvoiceSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.vendorInvoice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            const invoice = await prisma.vendorInvoice.update({
              where: { id: params.id },
              data: {
                ...(body.invoiceNumber !== undefined && { invoice_number: body.invoiceNumber }),
                ...(body.poId !== undefined && { po_id: body.poId }),
                ...(body.items !== undefined && { items: body.items as object[] }),
                ...(body.subtotal !== undefined && { subtotal: body.subtotal }),
                ...(body.tax !== undefined && { tax: body.tax }),
                ...(body.total !== undefined && { total: body.total }),
                ...(body.invoiceDate !== undefined && { invoice_date: new Date(body.invoiceDate) }),
                ...(body.dueDate !== undefined && {
                  due_date: body.dueDate ? new Date(body.dueDate) : null,
                }),
                ...(body.notes !== undefined && { notes: body.notes }),
              },
              include: invoiceInclude,
            })

            return { invoice }
          },
          {
            params: t.Object({ id: t.String() }),
            body: updateInvoiceSchema,
          }
        )
        .post(
          '/:id/mark-paid',
          async ({ params, body, set }) => {
            const existing = await prisma.vendorInvoice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            const invoice = await prisma.vendorInvoice.update({
              where: { id: params.id },
              data: {
                payment_status: 'PAID',
                payment_date: body.paymentDate ? new Date(body.paymentDate) : new Date(),
              },
              include: invoiceInclude,
            })

            return { invoice }
          },
          {
            params: t.Object({ id: t.String() }),
            body: t.Object({
              paymentDate: t.Optional(t.String()),
            }),
          }
        )
        .delete(
          '/:id',
          async ({ params, set }) => {
            const existing = await prisma.vendorInvoice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            await prisma.vendorInvoice.delete({ where: { id: params.id } })
            return { success: true }
          },
          { params: t.Object({ id: t.String() }) }
        )
  )
