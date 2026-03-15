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

const createCommercialQuotationSchema = t.Object({
  quotationNumber: t.Optional(t.String()),
  customerId: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  items: t.Optional(t.Array(t.Any())),
  terms: t.Optional(t.String()),
  conditions: t.Optional(t.String()),
  totalAmount: t.Optional(t.Number()),
  status: t.Optional(quotationStatusUnion),
})

const updateCommercialQuotationSchema = t.Object({
  quotationNumber: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  items: t.Optional(t.Array(t.Any())),
  terms: t.Optional(t.String()),
  conditions: t.Optional(t.String()),
  totalAmount: t.Optional(t.Number()),
  status: t.Optional(quotationStatusUnion),
})

const rejectCommercialQuotationSchema = t.Object({
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

async function generateCommercialQuotationNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `CQ-${yearMonth}-`

  const count = await prisma.commercialQuotation.count({
    where: {
      quotation_number: { startsWith: prefix },
    },
  })

  const sequence = String(count + 1).padStart(4, '0')
  return `${prefix}${sequence}`
}

export const commercialQuotationsRoutes = new Elysia({ prefix: '/api/commercial-quotations' })
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
          const quotations = await prisma.commercialQuotation.findMany({
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
              prisma.commercialQuotation.count({ where }),
              prisma.commercialQuotation.findMany({
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
          const quotation = await prisma.commercialQuotation.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              project: { select: { id: true, name: true, code: true } },
              creator: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!quotation) {
            set.status = 404
            return { error: 'Commercial quotation not found' }
          }
          return { quotation }
        })
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const user = authUser as AuthenticatedUser
            const quotationNumber =
              body.quotationNumber || (await generateCommercialQuotationNumber())

            const quotation = await prisma.commercialQuotation.create({
              data: {
                quotation_number: quotationNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                items: (body.items as object[]) ?? [],
                terms: body.terms ?? null,
                conditions: body.conditions ?? null,
                total_amount: body.totalAmount ?? 0,
                status: body.status ?? 'DRAFT',
                created_by: user.id,
              },
            })
            set.status = 201
            return { quotation }
          },
          { body: createCommercialQuotationSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.commercialQuotation.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Commercial quotation not found' }
            }

            const quotation = await prisma.commercialQuotation.update({
              where: { id: params.id },
              data: {
                quotation_number: body.quotationNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                items: body.items !== undefined ? (body.items as object[]) : undefined,
                terms: body.terms,
                conditions: body.conditions,
                total_amount: body.totalAmount,
                status: body.status,
              },
            })
            return { quotation }
          },
          { body: updateCommercialQuotationSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.commercialQuotation.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Commercial quotation not found' }
          }
          await prisma.commercialQuotation.delete({ where: { id: params.id } })
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
              .post('/:id/approve', async ({ params, set }) => {
                const quotation = await prisma.commercialQuotation.findUnique({
                  where: { id: params.id },
                })
                if (!quotation) {
                  set.status = 404
                  return { error: 'Commercial quotation not found' }
                }
                if (!APPROVABLE_STATUSES.includes(quotation.status as QuotationStatusValue)) {
                  set.status = 409
                  return { error: 'Only sent quotations can be approved' }
                }
                const updated = await prisma.commercialQuotation.update({
                  where: { id: params.id },
                  data: { status: 'APPROVED' },
                })
                return { quotation: updated }
              })
              .post(
                '/:id/reject',
                async ({ params, body, set }) => {
                  const quotation = await prisma.commercialQuotation.findUnique({
                    where: { id: params.id },
                  })
                  if (!quotation) {
                    set.status = 404
                    return { error: 'Commercial quotation not found' }
                  }
                  if (!APPROVABLE_STATUSES.includes(quotation.status as QuotationStatusValue)) {
                    set.status = 409
                    return { error: 'Only sent quotations can be rejected' }
                  }
                  const updated = await prisma.commercialQuotation.update({
                    where: { id: params.id },
                    data: { status: 'REJECTED' },
                  })
                  return { quotation: updated, reason: body.reason }
                },
                { body: rejectCommercialQuotationSchema }
              )
        )
  )
