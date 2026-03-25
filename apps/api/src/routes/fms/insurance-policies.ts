import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const INSURANCE_POLICY_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_RENEWAL'] as const

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const policyInclude = {
  project: { select: { id: true, name: true, code: true } },
}

const createPolicySchema = t.Object({
  policyNumber: t.String({ minLength: 1 }),
  provider: t.String({ minLength: 1 }),
  type: t.String({ minLength: 1 }),
  coverageDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  projectId: t.Optional(t.String()),
  premium: t.Optional(t.Number()),
  startDate: t.String({ minLength: 1 }),
  endDate: t.String({ minLength: 1 }),
  status: t.Optional(t.String()),
  documentUrl: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updatePolicySchema = t.Object({
  policyNumber: t.Optional(t.String({ minLength: 1 })),
  provider: t.Optional(t.String({ minLength: 1 })),
  type: t.Optional(t.String({ minLength: 1 })),
  coverageDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  projectId: t.Optional(t.String()),
  premium: t.Optional(t.Number()),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  status: t.Optional(t.String()),
  documentUrl: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const fmsInsurancePoliciesRoutes = new Elysia({ prefix: '/api/fms/insurance-policies' })
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

            if (query.projectId) where.project_id = query.projectId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.type) where.type = query.type
            if (query.search) {
              where.OR = [
                { policy_number: { contains: query.search, mode: 'insensitive' } },
                { provider: { contains: query.search, mode: 'insensitive' } },
                { type: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, policies] = await Promise.all([
              prisma.insurancePolicy.count({ where }),
              prisma.insurancePolicy.findMany({
                where,
                skip,
                take: limit,
                orderBy: { end_date: 'asc' },
                include: policyInclude,
              }),
            ])

            return { data: policies, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              type: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const policy = await prisma.insurancePolicy.findUnique({
            where: { id: params.id },
            include: policyInclude,
          })
          if (!policy) {
            set.status = 404
            return { error: 'Insurance policy not found' }
          }
          return { policy }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const existing = await prisma.insurancePolicy.findUnique({
              where: { policy_number: body.policyNumber },
            })
            if (existing) {
              set.status = 409
              return { error: 'Policy number already exists' }
            }

            const policy = await prisma.insurancePolicy.create({
              data: {
                policy_number: body.policyNumber,
                provider: body.provider,
                type: body.type,
                coverage_details: body.coverageDetails ?? {},
                project_id: body.projectId ?? null,
                premium: body.premium ?? null,
                start_date: new Date(body.startDate),
                end_date: new Date(body.endDate),
                status:
                  (body.status as typeof INSURANCE_POLICY_STATUSES[number]) ?? 'ACTIVE',
                document_url: body.documentUrl ?? null,
                notes: body.notes ?? null,
              },
              include: policyInclude,
            })
            set.status = 201
            return { policy }
          },
          { body: createPolicySchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.insurancePolicy.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Insurance policy not found' }
            }

            if (body.policyNumber && body.policyNumber !== existing.policy_number) {
              const conflict = await prisma.insurancePolicy.findUnique({
                where: { policy_number: body.policyNumber },
              })
              if (conflict) {
                set.status = 409
                return { error: 'Policy number already exists' }
              }
            }

            const policy = await prisma.insurancePolicy.update({
              where: { id: params.id },
              data: {
                ...(body.policyNumber !== undefined && { policy_number: body.policyNumber }),
                ...(body.provider !== undefined && { provider: body.provider }),
                ...(body.type !== undefined && { type: body.type }),
                ...(body.coverageDetails !== undefined && {
                  coverage_details: body.coverageDetails,
                }),
                ...(body.projectId !== undefined && { project_id: body.projectId ?? null }),
                ...(body.premium !== undefined && { premium: body.premium ?? null }),
                ...(body.startDate !== undefined && { start_date: new Date(body.startDate) }),
                ...(body.endDate !== undefined && { end_date: new Date(body.endDate) }),
                ...(body.status !== undefined && {
                  status: body.status as typeof INSURANCE_POLICY_STATUSES[number],
                }),
                ...(body.documentUrl !== undefined && {
                  document_url: body.documentUrl ?? null,
                }),
                ...(body.notes !== undefined && { notes: body.notes ?? null }),
              },
              include: policyInclude,
            })
            return { policy }
          },
          { body: updatePolicySchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.insurancePolicy.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Insurance policy not found' }
          }
          await prisma.insurancePolicy.delete({ where: { id: params.id } })
          return { success: true }
        })
  )

export { INSURANCE_POLICY_STATUSES }
