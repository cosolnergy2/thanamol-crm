import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateAPNumber(): Promise<string> {
  const prefix = 'AP-'
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const fullPrefix = `${prefix}${yearMonth}-`
  const count = await prisma.aPInvoice.count({
    where: { ap_invoice_number: { startsWith: fullPrefix } },
  })
  return `${fullPrefix}${String(count + 1).padStart(4, '0')}`
}

export const financeAPInvoicesRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/ap-invoices',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.vendorId) where.vendor_id = query.vendorId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { ap_invoice_number: { contains: query.search, mode: 'insensitive' } },
                { vendor_invoice_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }
            const [total, data] = await Promise.all([
              prisma.aPInvoice.count({ where }),
              prisma.aPInvoice.findMany({
                where, skip, take: limit,
                include: { vendor: { select: { id: true, name: true, vendor_code: true } } },
                orderBy: { invoice_date: 'desc' },
              }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()), limit: t.Optional(t.String()),
              vendorId: t.Optional(t.String()), status: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/ap-invoices/:id', async ({ params, set }) => {
          const invoice = await prisma.aPInvoice.findUnique({
            where: { id: params.id },
            include: {
              vendor: { select: { id: true, name: true, vendor_code: true } },
              creator: { select: { id: true, first_name: true, last_name: true } },
              approver: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!invoice) { set.status = 404; return { error: 'AP Invoice not found' } }
          return { invoice }
        })
        .post(
          '/ap-invoices',
          async ({ body, authUser }) => {
            const apNumber = await generateAPNumber()
            const invoice = await prisma.aPInvoice.create({
              data: {
                ap_invoice_number: apNumber,
                vendor_id: body.vendorId,
                vendor_invoice_number: body.vendorInvoiceNumber,
                invoice_date: new Date(body.invoiceDate),
                due_date: new Date(body.dueDate),
                payment_terms: body.paymentTerms,
                subtotal: body.subtotal,
                vat_amount: body.vatAmount ?? 0,
                wht_amount: body.whtAmount ?? 0,
                total_amount: body.totalAmount,
                matched_po_id: body.matchedPoId,
                matched_grn_id: body.matchedGrnId,
                gl_account_code: body.glAccountCode,
                items: body.items ?? null,
                notes: body.notes,
                created_by: authUser!.id,
              },
            })
            return { invoice }
          },
          {
            body: t.Object({
              vendorId: t.String({ minLength: 1 }),
              vendorInvoiceNumber: t.Optional(t.String()),
              invoiceDate: t.String({ minLength: 1 }),
              dueDate: t.String({ minLength: 1 }),
              paymentTerms: t.Optional(t.String()),
              subtotal: t.Number({ minimum: 0 }),
              vatAmount: t.Optional(t.Number()),
              whtAmount: t.Optional(t.Number()),
              totalAmount: t.Number({ minimum: 0 }),
              matchedPoId: t.Optional(t.String()),
              matchedGrnId: t.Optional(t.String()),
              glAccountCode: t.Optional(t.String()),
              items: t.Optional(t.Any()),
              notes: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/ap-invoices/aging',
          async () => {
            const now = new Date()
            const invoices = await prisma.aPInvoice.findMany({
              where: { status: { in: ['AP_APPROVED', 'AP_PARTIALLY_PAID'] } },
              include: { vendor: { select: { id: true, name: true } } },
            })

            const vendorMap = new Map<string, {
              vendor_id: string; vendor_name: string;
              current: number; days_1_30: number; days_31_60: number; days_61_90: number; over_90: number; total: number
            }>()

            for (const inv of invoices) {
              const daysDue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
              const amount = Number(inv.total_amount)

              if (!vendorMap.has(inv.vendor_id)) {
                vendorMap.set(inv.vendor_id, {
                  vendor_id: inv.vendor_id,
                  vendor_name: inv.vendor.name,
                  current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0,
                })
              }

              const bucket = vendorMap.get(inv.vendor_id)!
              bucket.total += amount
              if (daysDue <= 0) bucket.current += amount
              else if (daysDue <= 30) bucket.days_1_30 += amount
              else if (daysDue <= 60) bucket.days_31_60 += amount
              else if (daysDue <= 90) bucket.days_61_90 += amount
              else bucket.over_90 += amount
            }

            const buckets = Array.from(vendorMap.values())
            const totals = buckets.reduce(
              (acc, b) => ({
                vendor_id: '', vendor_name: 'Total',
                current: acc.current + b.current,
                days_1_30: acc.days_1_30 + b.days_1_30,
                days_31_60: acc.days_31_60 + b.days_31_60,
                days_61_90: acc.days_61_90 + b.days_61_90,
                over_90: acc.over_90 + b.over_90,
                total: acc.total + b.total,
              }),
              { vendor_id: '', vendor_name: 'Total', current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 }
            )

            return { buckets, totals }
          }
        )
  )
