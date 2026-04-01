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

const vendorStatusUnion = t.Union([
  t.Literal('ACTIVE'),
  t.Literal('INACTIVE'),
  t.Literal('BLACKLISTED'),
  t.Literal('PENDING_APPROVAL'),
])

const createVendorSchema = t.Object({
  name: t.String({ minLength: 1 }),
  taxId: t.Optional(t.String()),
  address: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  email: t.Optional(t.String()),
  website: t.Optional(t.String()),
  contactPerson: t.Optional(t.String()),
  contactPhone: t.Optional(t.String()),
  contactEmail: t.Optional(t.String()),
  category: t.Optional(t.String()),
  rating: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
  status: t.Optional(vendorStatusUnion),
  bankDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  notes: t.Optional(t.String()),
  legalName: t.Optional(t.String()),
  displayName: t.Optional(t.String()),
  vendorType: t.Optional(t.String()),
  companyRegistration: t.Optional(t.String()),
  additionalContacts: t.Optional(t.Unknown()),
  serviceTags: t.Optional(t.Unknown()),
  supplierType: t.Optional(t.String()),
  paymentTerms: t.Optional(t.String()),
  creditDays: t.Optional(t.Number()),
  creditLimit: t.Optional(t.Number()),
  defaultConditions: t.Optional(t.Unknown()),
  ratingLevel: t.Optional(t.String()),
  registerAllCompanies: t.Optional(t.Boolean()),
  companyId: t.Optional(t.String()),
})

const updateVendorSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  taxId: t.Optional(t.Nullable(t.String())),
  address: t.Optional(t.Nullable(t.String())),
  phone: t.Optional(t.Nullable(t.String())),
  email: t.Optional(t.Nullable(t.String())),
  website: t.Optional(t.Nullable(t.String())),
  contactPerson: t.Optional(t.Nullable(t.String())),
  contactPhone: t.Optional(t.Nullable(t.String())),
  contactEmail: t.Optional(t.Nullable(t.String())),
  category: t.Optional(t.Nullable(t.String())),
  rating: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 5 }))),
  status: t.Optional(vendorStatusUnion),
  bankDetails: t.Optional(t.Record(t.String(), t.Unknown())),
  notes: t.Optional(t.Nullable(t.String())),
  legalName: t.Optional(t.Nullable(t.String())),
  displayName: t.Optional(t.Nullable(t.String())),
  vendorType: t.Optional(t.Nullable(t.String())),
  companyRegistration: t.Optional(t.Nullable(t.String())),
  additionalContacts: t.Optional(t.Nullable(t.Unknown())),
  serviceTags: t.Optional(t.Nullable(t.Unknown())),
  supplierType: t.Optional(t.Nullable(t.String())),
  paymentTerms: t.Optional(t.Nullable(t.String())),
  creditDays: t.Optional(t.Nullable(t.Number())),
  creditLimit: t.Optional(t.Nullable(t.Number())),
  defaultConditions: t.Optional(t.Nullable(t.Unknown())),
  ratingLevel: t.Optional(t.Nullable(t.String())),
  registerAllCompanies: t.Optional(t.Boolean()),
  companyId: t.Optional(t.Nullable(t.String())),
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
                legal_name: body.legalName,
                display_name: body.displayName,
                vendor_type: body.vendorType,
                company_registration: body.companyRegistration,
                additional_contacts: (body.additionalContacts as object) ?? undefined,
                service_tags: (body.serviceTags as object) ?? undefined,
                supplier_type: body.supplierType,
                payment_terms: body.paymentTerms,
                credit_limit: body.creditLimit,
                default_conditions: (body.defaultConditions as object) ?? undefined,
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
                ...(body.legalName !== undefined && { legal_name: body.legalName }),
                ...(body.displayName !== undefined && { display_name: body.displayName }),
                ...(body.vendorType !== undefined && { vendor_type: body.vendorType }),
                ...(body.companyRegistration !== undefined && { company_registration: body.companyRegistration }),
                ...(body.additionalContacts !== undefined && { additional_contacts: body.additionalContacts as object }),
                ...(body.serviceTags !== undefined && { service_tags: body.serviceTags as object }),
                ...(body.supplierType !== undefined && { supplier_type: body.supplierType }),
                ...(body.paymentTerms !== undefined && { payment_terms: body.paymentTerms }),
                ...(body.creditLimit !== undefined && { credit_limit: body.creditLimit }),
                ...(body.defaultConditions !== undefined && { default_conditions: body.defaultConditions as object }),
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
