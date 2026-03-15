import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'

const SALE_JOB_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const
type SaleJobStatusValue = (typeof SALE_JOB_STATUSES)[number]

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function generateFormNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `SJ04F01-${yearMonth}-`

  const count = await prisma.saleJob04F01.count({
    where: { form_number: { startsWith: prefix } },
  })

  const sequence = String(count + 1).padStart(4, '0')
  return `${prefix}${sequence}`
}

const saleJobStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('SUBMITTED'),
  t.Literal('APPROVED'),
  t.Literal('REJECTED'),
])

const createSaleJobSchema = t.Object({
  formNumber: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  customerId: t.String({ minLength: 1 }),
  unitId: t.Optional(t.String()),
  formData: t.Optional(t.Record(t.String(), t.Unknown())),
  status: t.Optional(saleJobStatusUnion),
})

const updateSaleJobSchema = t.Object({
  projectId: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  formData: t.Optional(t.Record(t.String(), t.Unknown())),
  status: t.Optional(saleJobStatusUnion),
})

const saleJobIncludes = {
  project: { select: { id: true, name: true, code: true } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  unit: { select: { id: true, unit_number: true, floor: true, building: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

export const saleJobsRoutes = new Elysia({ prefix: '/api/sale-jobs' })
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

            if (query.status && SALE_JOB_STATUSES.includes(query.status as SaleJobStatusValue)) {
              where.status = query.status
            }

            if (query.projectId) {
              where.project_id = query.projectId
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            const [total, items] = await Promise.all([
              prisma.saleJob04F01.count({ where }),
              prisma.saleJob04F01.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: saleJobIncludes,
              }),
            ])

            return {
              data: items,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const item = await prisma.saleJob04F01.findUnique({
            where: { id: params.id },
            include: saleJobIncludes,
          })
          if (!item) {
            set.status = 404
            return { error: 'Sale job not found' }
          }
          return { saleJob: item }
        })
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const user = authUser as AuthenticatedUser
            const formNumber = body.formNumber || (await generateFormNumber())
            const item = await prisma.saleJob04F01.create({
              data: {
                form_number: formNumber,
                project_id: body.projectId,
                customer_id: body.customerId,
                unit_id: body.unitId ?? null,
                form_data: (body.formData as object) ?? {},
                status: body.status ?? 'DRAFT',
                created_by: user.id,
              },
              include: saleJobIncludes,
            })
            set.status = 201
            return { saleJob: item }
          },
          { body: createSaleJobSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.saleJob04F01.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Sale job not found' }
            }
            const item = await prisma.saleJob04F01.update({
              where: { id: params.id },
              data: {
                project_id: body.projectId,
                customer_id: body.customerId,
                unit_id: body.unitId,
                form_data: body.formData as object | undefined,
                status: body.status,
              },
              include: saleJobIncludes,
            })
            return { saleJob: item }
          },
          { body: updateSaleJobSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.saleJob04F01.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Sale job not found' }
          }
          if (existing.status !== 'DRAFT') {
            set.status = 409
            return { error: 'Only DRAFT sale jobs can be deleted' }
          }
          await prisma.saleJob04F01.delete({ where: { id: params.id } })
          return { success: true }
        })
        .post('/:id/approve', async ({ params, authUser, set }) => {
          const existing = await prisma.saleJob04F01.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Sale job not found' }
          }
          if (existing.status !== 'SUBMITTED') {
            set.status = 409
            return { error: 'Only SUBMITTED sale jobs can be approved' }
          }
          const user = authUser as AuthenticatedUser
          const item = await prisma.saleJob04F01.update({
            where: { id: params.id },
            data: { status: 'APPROVED', approved_by: user.id },
            include: saleJobIncludes,
          })
          return { saleJob: item }
        })
        .post(
          '/:id/reject',
          async ({ params, set }) => {
            const existing = await prisma.saleJob04F01.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Sale job not found' }
            }
            if (existing.status !== 'SUBMITTED') {
              set.status = 409
              return { error: 'Only SUBMITTED sale jobs can be rejected' }
            }
            const item = await prisma.saleJob04F01.update({
              where: { id: params.id },
              data: { status: 'REJECTED' },
              include: saleJobIncludes,
            })
            return { saleJob: item }
          }
        )
  )
