import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateVendorCode(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `VND-${yearMonth}-`

  const count = await prisma.vendor.count({
    where: { vendor_code: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const createVendorSchema = t.Object({
  name: t.String({ minLength: 1 }),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  website: t.Optional(t.String()),
  contactPerson: t.Optional(t.String()),
  category: t.Optional(t.String()),
  rating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
  status: t.Optional(
    t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('BLACKLISTED'), t.Literal('PENDING_APPROVAL')])
  ),
  bankDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  notes: t.Optional(t.String()),
})

const updateVendorSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  taxId: t.Optional(t.Nullable(t.String())),
  address: t.Optional(t.Nullable(t.String())),
  phone: t.Optional(t.Nullable(t.String())),
  email: t.Optional(t.Nullable(t.String())),
  website: t.Optional(t.Nullable(t.String())),
  contactPerson: t.Optional(t.Nullable(t.String())),
  category: t.Optional(t.Nullable(t.String())),
  rating: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 5 }))),
  status: t.Optional(
    t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('BLACKLISTED'), t.Literal('PENDING_APPROVAL')])
  ),
  bankDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  notes: t.Optional(t.Nullable(t.String())),
})

export const fmsVendorsRoutes = new Elysia({ prefix: '/api/fms/vendors' })
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
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.category) where.category = query.category
            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { vendor_code: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { contact_person: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [data, total] = await Promise.all([
              prisma.vendor.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
              }),
              prisma.vendor.count({ where }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              category: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const vendor = await prisma.vendor.findUnique({
              where: { id: params.id },
              include: {
                contracts: {
                  include: {
                    project: { select: { id: true, name: true, code: true } },
                  },
                  orderBy: { created_at: 'desc' },
                },
                item_prices: {
                  orderBy: { created_at: 'desc' },
                },
                invoices: {
                  orderBy: { created_at: 'desc' },
                },
              },
            })

            if (!vendor) {
              set.status = 404
              return { error: 'Vendor not found' }
            }

            return { vendor }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/',
          async ({ body, set }) => {
            const vendor_code = await generateVendorCode()

            const vendor = await prisma.vendor.create({
              data: {
                vendor_code,
                name: body.name,
                tax_id: body.taxId,
                address: body.address,
                phone: body.phone,
                email: body.email,
                website: body.website,
                contact_person: body.contactPerson,
                category: body.category,
                rating: body.rating,
                status: body.status ?? 'ACTIVE',
                bank_details: (body.bankDetails as object) ?? {},
                notes: body.notes,
              },
            })

            set.status = 201
            return { vendor }
          },
          { body: createVendorSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.vendor.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Vendor not found' }
            }

            const vendor = await prisma.vendor.update({
              where: { id: params.id },
              data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.taxId !== undefined && { tax_id: body.taxId }),
                ...(body.address !== undefined && { address: body.address }),
                ...(body.phone !== undefined && { phone: body.phone }),
                ...(body.email !== undefined && { email: body.email }),
                ...(body.website !== undefined && { website: body.website }),
                ...(body.contactPerson !== undefined && { contact_person: body.contactPerson }),
                ...(body.category !== undefined && { category: body.category }),
                ...(body.rating !== undefined && { rating: body.rating }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.bankDetails !== undefined && { bank_details: body.bankDetails as object }),
                ...(body.notes !== undefined && { notes: body.notes }),
              },
            })

            return { vendor }
          },
          {
            params: t.Object({ id: t.String() }),
            body: updateVendorSchema,
          }
        )
        .delete(
          '/:id',
          async ({ params, set }) => {
            const existing = await prisma.vendor.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Vendor not found' }
            }

            await prisma.vendor.delete({ where: { id: params.id } })
            return { success: true }
          },
          { params: t.Object({ id: t.String() }) }
        )
  )
