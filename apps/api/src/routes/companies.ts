import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const createCompanySchema = t.Object({
  name: t.String({ minLength: 1 }),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  website: t.Optional(t.String()),
  industry: t.Optional(t.String()),
  status: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

const updateCompanySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  website: t.Optional(t.String()),
  industry: t.Optional(t.String()),
  status: t.Optional(t.String()),
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

export const companiesRoutes = new Elysia({ prefix: '/api/companies' })
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
                { tax_id: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            if (query.industry) {
              where.industry = { contains: query.industry, mode: 'insensitive' }
            }

            if (query.status) {
              where.status = query.status
            }

            const [total, companies] = await Promise.all([
              prisma.company.count({ where }),
              prisma.company.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: companies,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              search: t.Optional(t.String()),
              industry: t.Optional(t.String()),
              status: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const company = await prisma.company.findUnique({
            where: { id: params.id },
          })
          if (!company) {
            set.status = 404
            return { error: 'Company not found' }
          }
          return { company }
        })
        .post(
          '/',
          async ({ body, set, authUser, headers }) => {
            const company = await prisma.company.create({
              data: {
                name: body.name,
                tax_id: body.taxId,
                address: body.address,
                phone: body.phone,
                email: body.email,
                website: body.website,
                industry: body.industry,
                status: body.status ?? 'ACTIVE',
                notes: body.notes,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Company',
              entityId: company.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { company }
          },
          { body: createCompanySchema }
        )
        .put(
          '/:id',
          async ({ params, body, set, authUser, headers }) => {
            const existing = await prisma.company.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Company not found' }
            }
            const company = await prisma.company.update({
              where: { id: params.id },
              data: {
                name: body.name,
                tax_id: body.taxId,
                address: body.address,
                phone: body.phone,
                email: body.email,
                website: body.website,
                industry: body.industry,
                status: body.status,
                notes: body.notes,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Company',
              entityId: company.id,
              ipAddress: getIpAddress(headers),
            })
            return { company }
          },
          { body: updateCompanySchema }
        )
        .delete('/:id', async ({ params, set, authUser, headers }) => {
          const existing = await prisma.company.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Company not found' }
          }
          await prisma.company.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Company',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
