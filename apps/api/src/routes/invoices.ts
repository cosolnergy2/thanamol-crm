import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL'] as const
type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number]

const invoiceStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('SENT'),
  t.Literal('PAID'),
  t.Literal('OVERDUE'),
  t.Literal('CANCELLED'),
  t.Literal('PARTIAL'),
])

const invoiceItemSchema = t.Object({
  description: t.String(),
  quantity: t.Number(),
  unit_price: t.Number(),
  amount: t.Number(),
  item_type: t.Optional(t.String()),
})

const createInvoiceSchema = t.Object({
  invoiceNumber: t.Optional(t.String()),
  contractId: t.Optional(t.String()),
  customerId: t.String({ minLength: 1 }),
  items: t.Optional(t.Array(invoiceItemSchema)),
  subtotal: t.Optional(t.Number()),
  tax: t.Optional(t.Number()),
  total: t.Optional(t.Number()),
  dueDate: t.Optional(t.String()),
  status: t.Optional(invoiceStatusUnion),
  notes: t.Optional(t.String()),
})

const updateInvoiceSchema = t.Object({
  invoiceNumber: t.Optional(t.String()),
  contractId: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  items: t.Optional(t.Array(invoiceItemSchema)),
  subtotal: t.Optional(t.Number()),
  tax: t.Optional(t.Number()),
  total: t.Optional(t.Number()),
  dueDate: t.Optional(t.String()),
  status: t.Optional(invoiceStatusUnion),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yearMonth}-`
  const count = await prisma.invoice.count({ where: { invoice_number: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

const invoiceIncludes = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  contract: { select: { id: true, contract_number: true, type: true, status: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
}

export const invoicesRoutes = new Elysia({ prefix: '/api/invoices' })
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
            if (query.status && INVOICE_STATUSES.includes(query.status as InvoiceStatusValue)) {
              where.status = query.status
            }
            if (query.customerId) where.customer_id = query.customerId
            if (query.contractId) where.contract_id = query.contractId

            const [total, invoices] = await Promise.all([
              prisma.invoice.count({ where }),
              prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: invoiceIncludes,
              }),
            ])

            return { data: invoices, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              contractId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const invoice = await prisma.invoice.findUnique({
            where: { id: params.id },
            include: invoiceIncludes,
          })
          if (!invoice) {
            set.status = 404
            return { error: 'Invoice not found' }
          }
          return { invoice }
        })
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const invoiceNumber = body.invoiceNumber ?? (await generateInvoiceNumber())
            try {
              const invoice = await prisma.invoice.create({
                data: {
                  invoice_number: invoiceNumber,
                  contract_id: body.contractId ?? null,
                  customer_id: body.customerId,
                  items: (body.items ?? []) as object[],
                  subtotal: body.subtotal ?? 0,
                  tax: body.tax ?? 0,
                  total: body.total ?? 0,
                  due_date: body.dueDate ? new Date(body.dueDate) : null,
                  status: body.status ?? 'DRAFT',
                  notes: body.notes ?? null,
                  created_by: authUser!.id,
                },
                include: invoiceIncludes,
              })
              set.status = 201
              return { invoice }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to create invoice' }
            }
          },
          { body: createInvoiceSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.invoice.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Invoice not found' }
            }
            try {
              const invoice = await prisma.invoice.update({
                where: { id: params.id },
                data: {
                  ...(body.invoiceNumber !== undefined && { invoice_number: body.invoiceNumber }),
                  ...(body.contractId !== undefined && { contract_id: body.contractId }),
                  ...(body.customerId !== undefined && { customer_id: body.customerId }),
                  ...(body.items !== undefined && { items: body.items as object[] }),
                  ...(body.subtotal !== undefined && { subtotal: body.subtotal }),
                  ...(body.tax !== undefined && { tax: body.tax }),
                  ...(body.total !== undefined && { total: body.total }),
                  ...(body.dueDate !== undefined && {
                    due_date: body.dueDate ? new Date(body.dueDate) : null,
                  }),
                  ...(body.status !== undefined && { status: body.status }),
                  ...(body.notes !== undefined && { notes: body.notes }),
                },
                include: invoiceIncludes,
              })
              return { invoice }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to update invoice' }
            }
          },
          { body: updateInvoiceSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.invoice.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Invoice not found' }
          }
          await prisma.invoice.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
