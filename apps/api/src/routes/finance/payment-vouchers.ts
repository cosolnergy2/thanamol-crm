import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateVoucherNumber(): Promise<string> {
  const prefix = 'PV-'
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const fullPrefix = `${prefix}${yearMonth}-`
  const count = await prisma.paymentVoucher.count({
    where: { voucher_number: { startsWith: fullPrefix } },
  })
  return `${fullPrefix}${String(count + 1).padStart(4, '0')}`
}

export const financePaymentVouchersRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/payment-vouchers',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.vendorId) where.vendor_id = query.vendorId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { voucher_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, data] = await Promise.all([
              prisma.paymentVoucher.count({ where }),
              prisma.paymentVoucher.findMany({
                where, skip, take: limit,
                include: {
                  vendor: { select: { id: true, name: true, vendor_code: true } },
                  creator: { select: { id: true, first_name: true, last_name: true } },
                  approver: { select: { id: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
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
        .get('/payment-vouchers/:id', async ({ params, set }) => {
          const voucher = await prisma.paymentVoucher.findUnique({
            where: { id: params.id },
            include: {
              vendor: { select: { id: true, name: true, vendor_code: true } },
              creator: { select: { id: true, first_name: true, last_name: true } },
              approver: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!voucher) { set.status = 404; return { error: 'Payment voucher not found' } }
          return { voucher }
        })
        .post(
          '/payment-vouchers',
          async ({ body, authUser }) => {
            const voucherNumber = await generateVoucherNumber()
            const voucher = await prisma.paymentVoucher.create({
              data: {
                voucher_number: voucherNumber,
                vendor_id: body.vendorId,
                payment_date: new Date(body.paymentDate),
                total_amount: body.totalAmount,
                payment_method: body.paymentMethod,
                bank_account_id: body.bankAccountId,
                cheque_number: body.chequeNumber,
                ap_invoice_ids: body.apInvoiceIds ?? undefined,
                notes: body.notes,
                created_by: authUser!.id,
              },
              include: {
                vendor: { select: { id: true, name: true, vendor_code: true } },
              },
            })
            return { voucher }
          },
          {
            body: t.Object({
              vendorId: t.String({ minLength: 1 }),
              paymentDate: t.String({ minLength: 1 }),
              totalAmount: t.Number({ minimum: 0 }),
              paymentMethod: t.String({ minLength: 1 }),
              bankAccountId: t.Optional(t.String()),
              chequeNumber: t.Optional(t.String()),
              apInvoiceIds: t.Optional(t.Array(t.String())),
              notes: t.Optional(t.String()),
            }),
          }
        )
        .post('/payment-vouchers/:id/approve', async ({ params, authUser, set }) => {
          const existing = await prisma.paymentVoucher.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Voucher not found' } }
          if (existing.status !== 'PV_DRAFT' && existing.status !== 'PV_PENDING_APPROVAL') {
            set.status = 400; return { error: 'Cannot approve in current status' }
          }
          const voucher = await prisma.paymentVoucher.update({
            where: { id: params.id },
            data: { status: 'PV_APPROVED', approved_by: authUser!.id },
            include: { vendor: { select: { id: true, name: true, vendor_code: true } } },
          })
          return { voucher }
        })
        .post('/payment-vouchers/:id/pay', async ({ params, set }) => {
          const existing = await prisma.paymentVoucher.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Voucher not found' } }
          if (existing.status !== 'PV_APPROVED') { set.status = 400; return { error: 'Only approved vouchers can be paid' } }

          const voucher = await prisma.paymentVoucher.update({
            where: { id: params.id },
            data: { status: 'PV_PAID' },
            include: { vendor: { select: { id: true, name: true, vendor_code: true } } },
          })

          // Update AP invoice statuses if linked
          if (existing.ap_invoice_ids && Array.isArray(existing.ap_invoice_ids)) {
            await prisma.aPInvoice.updateMany({
              where: { id: { in: existing.ap_invoice_ids as string[] } },
              data: { status: 'AP_PAID' },
            })
          }

          return { voucher }
        })
  )
