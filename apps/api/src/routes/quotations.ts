import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { getUserAggregatedPermissions } from '../middleware/permissions'

const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'] as const
type QuotationStatusValue = typeof QUOTATION_STATUSES[number]

const APPROVABLE_STATUSES: QuotationStatusValue[] = ['SENT']

const quotationStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('SENT'),
  t.Literal('APPROVED'),
  t.Literal('REJECTED'),
  t.Literal('EXPIRED'),
])

const createQuotationSchema = t.Object({
  quotationNumber: t.Optional(t.String()),
  customerId: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  unitId: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  totalAmount: t.Optional(t.Number()),
  discount: t.Optional(t.Number()),
  tax: t.Optional(t.Number()),
  grandTotal: t.Optional(t.Number()),
  status: t.Optional(quotationStatusUnion),
  validUntil: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateQuotationSchema = t.Object({
  quotationNumber: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  totalAmount: t.Optional(t.Number()),
  discount: t.Optional(t.Number()),
  tax: t.Optional(t.Number()),
  grandTotal: t.Optional(t.Number()),
  status: t.Optional(quotationStatusUnion),
  validUntil: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const rejectQuotationSchema = t.Object({
  reason: t.String({ minLength: 1 }),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function generateQuotationNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `QT-${yearMonth}-`

  const count = await prisma.quotation.count({
    where: {
      quotation_number: { startsWith: prefix },
    },
  })

  const sequence = String(count + 1).padStart(4, '0')
  return `${prefix}${sequence}`
}

export const quotationsRoutes = new Elysia({ prefix: '/api/quotations' })
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
        .get('/pending', async () => {
          const quotations = await prisma.quotation.findMany({
            where: { status: 'SENT' },
            orderBy: { created_at: 'desc' },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              project: { select: { id: true, name: true, code: true } },
            },
          })
          return { data: quotations }
        })
        .get(
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.search) {
              where.quotation_number = { contains: query.search, mode: 'insensitive' }
            }

            if (
              query.status &&
              QUOTATION_STATUSES.includes(query.status as QuotationStatusValue)
            ) {
              where.status = query.status
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.projectId) {
              where.project_id = query.projectId
            }

            const [total, quotations] = await Promise.all([
              prisma.quotation.count({ where }),
              prisma.quotation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: quotations,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              search: t.Optional(t.String()),
              status: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const quotation = await prisma.quotation.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              project: { select: { id: true, name: true, code: true } },
              unit: { select: { id: true, unit_number: true, floor: true, building: true } },
              creator: { select: { id: true, first_name: true, last_name: true } },
              approver: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!quotation) {
            set.status = 404
            return { error: 'Quotation not found' }
          }
          return { quotation }
        })
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const user = authUser as AuthenticatedUser
            const quotationNumber = body.quotationNumber || (await generateQuotationNumber())

            const quotation = await prisma.quotation.create({
              data: {
                quotation_number: quotationNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                unit_id: body.unitId ?? null,
                items: (body.items as object[]) ?? [],
                total_amount: body.totalAmount ?? 0,
                discount: body.discount ?? 0,
                tax: body.tax ?? 0,
                grand_total: body.grandTotal ?? 0,
                status: body.status ?? 'DRAFT',
                valid_until: body.validUntil ? new Date(body.validUntil) : null,
                notes: body.notes ?? null,
                created_by: user.id,
              },
            })
            set.status = 201
            return { quotation }
          },
          { body: createQuotationSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.quotation.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Quotation not found' }
            }

            const quotation = await prisma.quotation.update({
              where: { id: params.id },
              data: {
                quotation_number: body.quotationNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                unit_id: body.unitId,
                items: body.items !== undefined ? (body.items as object[]) : undefined,
                total_amount: body.totalAmount,
                discount: body.discount,
                tax: body.tax,
                grand_total: body.grandTotal,
                status: body.status,
                valid_until:
                  body.validUntil !== undefined
                    ? body.validUntil
                      ? new Date(body.validUntil)
                      : null
                    : undefined,
                notes: body.notes,
              },
            })
            return { quotation }
          },
          { body: updateQuotationSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.quotation.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Quotation not found' }
          }
          await prisma.quotation.delete({ where: { id: params.id } })
          return { success: true }
        })
        .guard(
          {
            async beforeHandle({ authUser, set }) {
              const perms = await getUserAggregatedPermissions(
                (authUser as AuthenticatedUser).id
              )
              if (!perms['manage_contracts']) {
                set.status = 403
                return { error: 'Forbidden' }
              }
            },
          },
          (inner) =>
            inner
              .post('/:id/approve', async ({ params, authUser, set }) => {
                const quotation = await prisma.quotation.findUnique({ where: { id: params.id } })
                if (!quotation) {
                  set.status = 404
                  return { error: 'Quotation not found' }
                }
                if (!APPROVABLE_STATUSES.includes(quotation.status as QuotationStatusValue)) {
                  set.status = 409
                  return { error: 'Only sent quotations can be approved' }
                }
                const user = authUser as AuthenticatedUser
                const updated = await prisma.quotation.update({
                  where: { id: params.id },
                  data: {
                    status: 'APPROVED',
                    approved_by: user.id,
                  },
                })
                return { quotation: updated }
              })
              .post(
                '/:id/reject',
                async ({ params, body, set }) => {
                  const quotation = await prisma.quotation.findUnique({
                    where: { id: params.id },
                  })
                  if (!quotation) {
                    set.status = 404
                    return { error: 'Quotation not found' }
                  }
                  if (!APPROVABLE_STATUSES.includes(quotation.status as QuotationStatusValue)) {
                    set.status = 409
                    return { error: 'Only sent quotations can be rejected' }
                  }
                  const updated = await prisma.quotation.update({
                    where: { id: params.id },
                    data: {
                      status: 'REJECTED',
                      notes: body.reason,
                    },
                  })
                  return { quotation: updated }
                },
                { body: rejectQuotationSchema }
              )
        )
  )
