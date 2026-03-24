import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const CUSTOMER_TYPES = ['INDIVIDUAL', 'COMPANY'] as const
const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT'] as const

const createCustomerSchema = t.Object({
  name: t.String({ minLength: 1 }),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  address: t.Optional(t.String()),
  taxId: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal('INDIVIDUAL'), t.Literal('COMPANY')])),
  status: t.Optional(
    t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('PROSPECT')])
  ),
  notes: t.Optional(t.String()),
  lineId: t.Optional(t.String()),
  province: t.Optional(t.String()),
  leadSource: t.Optional(t.String()),
  industry: t.Optional(t.String()),
  companySize: t.Optional(t.String()),
  budgetRange: t.Optional(t.String()),
  depositConditions: t.Optional(t.String()),
  profileUrl: t.Optional(t.String()),
  pdpaConsent: t.Optional(t.Boolean()),
  interestedProjectId: t.Optional(t.String()),
})

const updateCustomerSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  address: t.Optional(t.String()),
  taxId: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal('INDIVIDUAL'), t.Literal('COMPANY')])),
  status: t.Optional(
    t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('PROSPECT')])
  ),
  notes: t.Optional(t.String()),
  lineId: t.Optional(t.String()),
  province: t.Optional(t.String()),
  leadSource: t.Optional(t.String()),
  industry: t.Optional(t.String()),
  companySize: t.Optional(t.String()),
  budgetRange: t.Optional(t.String()),
  depositConditions: t.Optional(t.String()),
  profileUrl: t.Optional(t.String()),
  pdpaConsent: t.Optional(t.Boolean()),
  interestedProjectId: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const customersRoutes = new Elysia({ prefix: '/api/customers' })
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

            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            if (query.type && CUSTOMER_TYPES.includes(query.type as typeof CUSTOMER_TYPES[number])) {
              where.type = query.type
            }

            if (query.status && CUSTOMER_STATUSES.includes(query.status as typeof CUSTOMER_STATUSES[number])) {
              where.status = query.status
            }

            const [total, customers] = await Promise.all([
              prisma.customer.count({ where }),
              prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { _count: { select: { contacts: true } } },
              }),
            ])

            return {
              data: customers,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              search: t.Optional(t.String()),
              type: t.Optional(t.String()),
              status: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const customer = await prisma.customer.findUnique({
            where: { id: params.id },
            include: { contacts: true, interested_project: true },
          })
          if (!customer) {
            set.status = 404
            return { error: 'Customer not found' }
          }
          return { customer }
        })
        .post(
          '/',
          async ({ body, set, authUser, headers }) => {
            const customer = await prisma.customer.create({
              data: {
                name: body.name,
                email: body.email,
                phone: body.phone,
                address: body.address,
                tax_id: body.taxId,
                type: body.type ?? 'INDIVIDUAL',
                status: body.status ?? 'ACTIVE',
                notes: body.notes,
                line_id: body.lineId,
                province: body.province,
                lead_source: body.leadSource,
                industry: body.industry,
                company_size: body.companySize,
                budget_range: body.budgetRange,
                deposit_conditions: body.depositConditions,
                profile_url: body.profileUrl,
                pdpa_consent: body.pdpaConsent ?? false,
                interested_project_id: body.interestedProjectId,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Customer',
              entityId: customer.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { customer }
          },
          { body: createCustomerSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set, authUser, headers }) => {
            const existing = await prisma.customer.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Customer not found' }
            }
            const customer = await prisma.customer.update({
              where: { id: params.id },
              data: {
                name: body.name,
                email: body.email,
                phone: body.phone,
                address: body.address,
                tax_id: body.taxId,
                type: body.type,
                status: body.status,
                notes: body.notes,
                line_id: body.lineId,
                province: body.province,
                lead_source: body.leadSource,
                industry: body.industry,
                company_size: body.companySize,
                budget_range: body.budgetRange,
                deposit_conditions: body.depositConditions,
                profile_url: body.profileUrl,
                pdpa_consent: body.pdpaConsent,
                interested_project_id: body.interestedProjectId,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Customer',
              entityId: customer.id,
              ipAddress: getIpAddress(headers),
            })
            return { customer }
          },
          { body: updateCustomerSchema }
        )
        .delete('/:id', async ({ params, set, authUser, headers }) => {
          const existing = await prisma.customer.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Customer not found' }
          }
          await prisma.customer.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Customer',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
