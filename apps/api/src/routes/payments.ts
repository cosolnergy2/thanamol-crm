import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'ONLINE'] as const

const paymentMethodUnion = t.Union([
  t.Literal('CASH'),
  t.Literal('BANK_TRANSFER'),
  t.Literal('CHEQUE'),
  t.Literal('CREDIT_CARD'),
  t.Literal('ONLINE'),
])

const createPaymentSchema = t.Object({
  invoiceId: t.String({ minLength: 1 }),
  amount: t.Number({ minimum: 0.01 }),
  paymentDate: t.String({ minLength: 1 }),
  paymentMethod: paymentMethodUnion,
  referenceNumber: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updatePaymentSchema = t.Object({
  invoiceId: t.Optional(t.String()),
  amount: t.Optional(t.Number({ minimum: 0.01 })),
  paymentDate: t.Optional(t.String()),
  paymentMethod: t.Optional(paymentMethodUnion),
  referenceNumber: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function recalculateInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  })
  if (!invoice) return

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)

  if (totalPaid >= invoice.total) {
    if (invoice.status !== 'PAID') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' },
      })
    }
    return
  }

  // When not fully paid, only transition away from OVERDUE if explicitly upgrading to PARTIAL.
  // OVERDUE status is preserved when balance is still outstanding.
  if (invoice.status === 'OVERDUE') {
    if (totalPaid > 0) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PARTIAL' },
      })
    }
    return
  }

  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return

  const newStatus: 'PARTIAL' | 'SENT' = totalPaid > 0 ? 'PARTIAL' : 'SENT'
  if (invoice.status !== newStatus) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    })
  }
}

const paymentIncludes = {
  invoice: {
    select: {
      id: true,
      invoice_number: true,
      total: true,
      status: true,
      customer_id: true,
    },
  },
  receiver: { select: { id: true, first_name: true, last_name: true } },
}

export const paymentsRoutes = new Elysia({ prefix: '/api/payments' })
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

            if (query.invoiceId) {
              where.invoice_id = query.invoiceId
            }

            if (
              query.paymentMethod &&
              PAYMENT_METHODS.includes(query.paymentMethod as (typeof PAYMENT_METHODS)[number])
            ) {
              where.payment_method = query.paymentMethod
            }

            const [total, payments] = await Promise.all([
              prisma.payment.count({ where }),
              prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: payments,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              invoiceId: t.Optional(t.String()),
              paymentMethod: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const payment = await prisma.payment.findUnique({
            where: { id: params.id },
            include: paymentIncludes,
          })
          if (!payment) {
            set.status = 404
            return { error: 'Payment not found' }
          }
          return { payment }
        })
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const user = authUser as AuthenticatedUser

            const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } })
            if (!invoice) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            const payment = await prisma.payment.create({
              data: {
                invoice_id: body.invoiceId,
                amount: body.amount,
                payment_date: new Date(body.paymentDate),
                payment_method: body.paymentMethod,
                reference_number: body.referenceNumber ?? null,
                notes: body.notes ?? null,
                received_by: user.id,
              },
            })

            await recalculateInvoiceStatus(body.invoiceId)

            set.status = 201
            return { payment }
          },
          { body: createPaymentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.payment.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Payment not found' }
            }

            const payment = await prisma.payment.update({
              where: { id: params.id },
              data: {
                invoice_id: body.invoiceId,
                amount: body.amount,
                payment_date: body.paymentDate ? new Date(body.paymentDate) : undefined,
                payment_method: body.paymentMethod,
                reference_number: body.referenceNumber,
                notes: body.notes,
              },
            })

            const targetInvoiceId = body.invoiceId ?? existing.invoice_id
            await recalculateInvoiceStatus(targetInvoiceId)

            return { payment }
          },
          { body: updatePaymentSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.payment.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Payment not found' }
          }

          await prisma.payment.delete({ where: { id: params.id } })
          await recalculateInvoiceStatus(existing.invoice_id)

          return { success: true }
        })
  )
