import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'ONLINE'] as const
type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]

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
  amount: t.Optional(t.Number()),
  paymentDate: t.Optional(t.String()),
  paymentMethod: t.Optional(paymentMethodUnion),
  referenceNumber: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const paymentIncludes = {
  invoice: {
    select: { id: true, invoice_number: true, total: true, status: true, customer_id: true },
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
            if (query.invoiceId) where.invoice_id = query.invoiceId
            if (query.paymentMethod && PAYMENT_METHODS.includes(query.paymentMethod as PaymentMethodValue)) {
              where.payment_method = query.paymentMethod
            }

            const [total, payments] = await Promise.all([
              prisma.payment.count({ where }),
              prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: paymentIncludes,
              }),
            ])

            return { data: payments, pagination: buildPagination(page, limit, total) }
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
            const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } })
            if (!invoice) {
              set.status = 404
              return { error: 'Invoice not found' }
            }

            try {
              const payment = await prisma.payment.create({
                data: {
                  invoice_id: body.invoiceId,
                  amount: body.amount,
                  payment_date: new Date(body.paymentDate),
                  payment_method: body.paymentMethod,
                  reference_number: body.referenceNumber ?? null,
                  notes: body.notes ?? null,
                  received_by: authUser!.id,
                },
                include: paymentIncludes,
              })

              const payments = await prisma.payment.findMany({ where: { invoice_id: body.invoiceId } })
              const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
              const newStatus =
                totalPaid >= invoice.total
                  ? 'PAID'
                  : totalPaid > 0
                    ? 'PARTIAL'
                    : invoice.status

              if (newStatus !== invoice.status) {
                await prisma.invoice.update({
                  where: { id: body.invoiceId },
                  data: { status: newStatus },
                })
              }

              set.status = 201
              return { payment }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to create payment' }
            }
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
            try {
              const payment = await prisma.payment.update({
                where: { id: params.id },
                data: {
                  ...(body.invoiceId !== undefined && { invoice_id: body.invoiceId }),
                  ...(body.amount !== undefined && { amount: body.amount }),
                  ...(body.paymentDate !== undefined && { payment_date: new Date(body.paymentDate) }),
                  ...(body.paymentMethod !== undefined && { payment_method: body.paymentMethod }),
                  ...(body.referenceNumber !== undefined && { reference_number: body.referenceNumber }),
                  ...(body.notes !== undefined && { notes: body.notes }),
                },
                include: paymentIncludes,
              })
              return { payment }
            } catch (err: unknown) {
              set.status = 400
              return { error: err instanceof Error ? err.message : 'Failed to update payment' }
            }
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
          return { success: true }
        })
  )
