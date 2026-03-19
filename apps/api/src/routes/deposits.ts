import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const DEPOSIT_STATUSES = ['HELD', 'APPLIED', 'REFUNDED', 'FORFEITED'] as const
type DepositStatusValue = (typeof DEPOSIT_STATUSES)[number]

const DEPOSIT_STATUS_TRANSITIONS: Record<DepositStatusValue, DepositStatusValue[]> = {
  HELD: ['APPLIED', 'REFUNDED', 'FORFEITED'],
  APPLIED: [],
  REFUNDED: [],
  FORFEITED: [],
}

const depositStatusUnion = t.Union([
  t.Literal('HELD'),
  t.Literal('APPLIED'),
  t.Literal('REFUNDED'),
  t.Literal('FORFEITED'),
])

const createDepositSchema = t.Object({
  contractId: t.String({ minLength: 1 }),
  customerId: t.String({ minLength: 1 }),
  amount: t.Number({ minimum: 0.01 }),
  depositDate: t.String({ minLength: 1 }),
  status: t.Optional(depositStatusUnion),
  refundDate: t.Optional(t.String()),
  refundAmount: t.Optional(t.Number()),
  notes: t.Optional(t.String()),
})

const updateDepositSchema = t.Object({
  contractId: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  amount: t.Optional(t.Number({ minimum: 0.01 })),
  depositDate: t.Optional(t.String()),
  status: t.Optional(depositStatusUnion),
  refundDate: t.Optional(t.String()),
  refundAmount: t.Optional(t.Number()),
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

const depositIncludes = {
  contract: { select: { id: true, contract_number: true, type: true, status: true } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
}

export const depositsRoutes = new Elysia({ prefix: '/api/deposits' })
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

            if (query.status && DEPOSIT_STATUSES.includes(query.status as DepositStatusValue)) {
              where.status = query.status
            }

            if (query.contractId) {
              where.contract_id = query.contractId
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            const [total, deposits] = await Promise.all([
              prisma.deposit.count({ where }),
              prisma.deposit.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: deposits,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              contractId: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const deposit = await prisma.deposit.findUnique({
            where: { id: params.id },
            include: depositIncludes,
          })
          if (!deposit) {
            set.status = 404
            return { error: 'Deposit not found' }
          }
          return { deposit }
        })
        .post(
          '/',
          async ({ body, set, authUser, headers }) => {
            const deposit = await prisma.deposit.create({
              data: {
                contract_id: body.contractId,
                customer_id: body.customerId,
                amount: body.amount,
                deposit_date: new Date(body.depositDate),
                status: body.status ?? 'HELD',
                refund_date: body.refundDate ? new Date(body.refundDate) : null,
                refund_amount: body.refundAmount ?? null,
                notes: body.notes ?? null,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Deposit',
              entityId: deposit.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { deposit }
          },
          { body: createDepositSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set, authUser, headers }) => {
            const existing = await prisma.deposit.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Deposit not found' }
            }

            if (body.status && body.status !== existing.status) {
              const currentStatus = existing.status as DepositStatusValue
              const allowedTransitions = DEPOSIT_STATUS_TRANSITIONS[currentStatus]
              if (!allowedTransitions.includes(body.status as DepositStatusValue)) {
                set.status = 422
                return {
                  error: `Invalid status transition: ${existing.status} -> ${body.status}`,
                }
              }
            }

            const deposit = await prisma.deposit.update({
              where: { id: params.id },
              data: {
                contract_id: body.contractId,
                customer_id: body.customerId,
                amount: body.amount,
                deposit_date: body.depositDate ? new Date(body.depositDate) : undefined,
                status: body.status,
                refund_date:
                  body.refundDate !== undefined
                    ? body.refundDate
                      ? new Date(body.refundDate)
                      : null
                    : undefined,
                refund_amount: body.refundAmount,
                notes: body.notes,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Deposit',
              entityId: deposit.id,
              ipAddress: getIpAddress(headers),
            })
            return { deposit }
          },
          { body: updateDepositSchema }
        )
        .delete('/:id', async ({ params, set, authUser, headers }) => {
          const existing = await prisma.deposit.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Deposit not found' }
          }
          await prisma.deposit.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Deposit',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
