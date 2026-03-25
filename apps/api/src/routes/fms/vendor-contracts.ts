import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateContractNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `VC-${yearMonth}-`

  const count = await prisma.vendorContract.count({
    where: { contract_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const contractInclude = {
  vendor: { select: { id: true, vendor_code: true, name: true } },
  project: { select: { id: true, name: true, code: true } },
}

const createContractSchema = t.Object({
  vendorId: t.String({ minLength: 1 }),
  title: t.String({ minLength: 1 }),
  scope: t.Optional(t.String()),
  startDate: t.String({ minLength: 1 }),
  endDate: t.String({ minLength: 1 }),
  value: t.Optional(t.Number({ minimum: 0 })),
  paymentTerms: t.Optional(t.String()),
  status: t.Optional(
    t.Union([t.Literal('DRAFT'), t.Literal('ACTIVE'), t.Literal('EXPIRED'), t.Literal('TERMINATED')])
  ),
  documentUrl: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
})

const updateContractSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  scope: t.Optional(t.Nullable(t.String())),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  value: t.Optional(t.Nullable(t.Number({ minimum: 0 }))),
  paymentTerms: t.Optional(t.Nullable(t.String())),
  status: t.Optional(
    t.Union([t.Literal('DRAFT'), t.Literal('ACTIVE'), t.Literal('EXPIRED'), t.Literal('TERMINATED')])
  ),
  documentUrl: t.Optional(t.Nullable(t.String())),
  projectId: t.Optional(t.Nullable(t.String())),
})

export const fmsVendorContractsRoutes = new Elysia({ prefix: '/api/fms/vendor-contracts' })
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
            if (query.vendorId) where.vendor_id = query.vendorId
            if (query.projectId) where.project_id = query.projectId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { contract_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [data, total] = await Promise.all([
              prisma.vendorContract.findMany({
                where,
                include: contractInclude,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
              }),
              prisma.vendorContract.count({ where }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              vendorId: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const contract = await prisma.vendorContract.findUnique({
              where: { id: params.id },
              include: contractInclude,
            })

            if (!contract) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            return { contract }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/',
          async ({ body, set }) => {
            const vendorExists = await prisma.vendor.findUnique({ where: { id: body.vendorId } })
            if (!vendorExists) {
              set.status = 404
              return { error: 'Vendor not found' }
            }

            const contract_number = await generateContractNumber()

            const contract = await prisma.vendorContract.create({
              data: {
                contract_number,
                vendor_id: body.vendorId,
                title: body.title,
                scope: body.scope,
                start_date: new Date(body.startDate),
                end_date: new Date(body.endDate),
                value: body.value,
                payment_terms: body.paymentTerms,
                status: body.status ?? 'DRAFT',
                document_url: body.documentUrl,
                project_id: body.projectId,
              },
              include: contractInclude,
            })

            set.status = 201
            return { contract }
          },
          { body: createContractSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.vendorContract.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            const contract = await prisma.vendorContract.update({
              where: { id: params.id },
              data: {
                ...(body.title !== undefined && { title: body.title }),
                ...(body.scope !== undefined && { scope: body.scope }),
                ...(body.startDate !== undefined && { start_date: new Date(body.startDate) }),
                ...(body.endDate !== undefined && { end_date: new Date(body.endDate) }),
                ...(body.value !== undefined && { value: body.value }),
                ...(body.paymentTerms !== undefined && { payment_terms: body.paymentTerms }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.documentUrl !== undefined && { document_url: body.documentUrl }),
                ...(body.projectId !== undefined && { project_id: body.projectId }),
              },
              include: contractInclude,
            })

            return { contract }
          },
          {
            params: t.Object({ id: t.String() }),
            body: updateContractSchema,
          }
        )
        .post(
          '/:id/activate',
          async ({ params, set }) => {
            const existing = await prisma.vendorContract.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            const contract = await prisma.vendorContract.update({
              where: { id: params.id },
              data: { status: 'ACTIVE' },
              include: contractInclude,
            })

            return { contract }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/:id/terminate',
          async ({ params, set }) => {
            const existing = await prisma.vendorContract.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            const contract = await prisma.vendorContract.update({
              where: { id: params.id },
              data: { status: 'TERMINATED' },
              include: contractInclude,
            })

            return { contract }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .delete(
          '/:id',
          async ({ params, set }) => {
            const existing = await prisma.vendorContract.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            await prisma.vendorContract.delete({ where: { id: params.id } })
            return { success: true }
          },
          { params: t.Object({ id: t.String() }) }
        )
  )
