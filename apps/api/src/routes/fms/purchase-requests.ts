import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generatePRNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `PR-${yearMonth}-`

  const count = await prisma.purchaseRequest.count({
    where: { pr_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const prInclude = {
  project: { select: { id: true, name: true, code: true } },
  requester: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

const prItemSchema = t.Object({
  item_name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  quantity: t.Number({ minimum: 0.001 }),
  unit_of_measure: t.Optional(t.String()),
  estimated_unit_price: t.Optional(t.Number()),
  total: t.Optional(t.Number()),
})

const createPRSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  items: t.Array(prItemSchema, { minItems: 1 }),
  estimatedTotal: t.Optional(t.Number()),
  priority: t.Optional(t.String()),
  requestedBy: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
})

const updatePRSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.Nullable(t.String())),
  items: t.Optional(t.Array(prItemSchema)),
  estimatedTotal: t.Optional(t.Nullable(t.Number())),
  priority: t.Optional(t.String()),
  notes: t.Optional(t.Nullable(t.String())),
})

export const fmsPurchaseRequestsRoutes = new Elysia({ prefix: '/api/fms/purchase-requests' })
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
            if (query.search) {
              where.OR = [
                { pr_number: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, requests] = await Promise.all([
              prisma.purchaseRequest.count({ where }),
              prisma.purchaseRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: prInclude,
              }),
            ])

            return { data: requests, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const pr = await prisma.purchaseRequest.findUnique({
            where: { id: params.id },
            include: {
              ...prInclude,
              purchase_orders: {
                select: { id: true, po_number: true, status: true, total: true, created_at: true },
              },
              vendor_quotations: {
                select: {
                  id: true,
                  quotation_number: true,
                  vendor_name: true,
                  total: true,
                  is_selected: true,
                },
              },
            },
          })
          if (!pr) {
            set.status = 404
            return { error: 'Purchase request not found' }
          }
          return { pr }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const prNumber = await generatePRNumber()

            const pr = await prisma.purchaseRequest.create({
              data: {
                pr_number: prNumber,
                title: body.title,
                description: body.description ?? null,
                project_id: body.projectId ?? null,
                items: body.items as object[],
                estimated_total: body.estimatedTotal ?? null,
                priority: body.priority ?? 'MEDIUM',
                requested_by: body.requestedBy,
                notes: body.notes ?? null,
              },
              include: prInclude,
            })

            set.status = 201
            return { pr }
          },
          { body: createPRSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.purchaseRequest.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Purchase request not found' }
            }

            if (existing.status !== 'DRAFT') {
              set.status = 400
              return { error: 'Only draft purchase requests can be edited' }
            }

            const pr = await prisma.purchaseRequest.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                project_id: body.projectId,
                items: body.items as object[] | undefined,
                estimated_total: body.estimatedTotal,
                priority: body.priority,
                notes: body.notes,
              },
              include: prInclude,
            })
            return { pr }
          },
          { body: updatePRSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.purchaseRequest.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Purchase request not found' }
          }

          if (existing.status !== 'DRAFT') {
            set.status = 400
            return { error: 'Only draft purchase requests can be deleted' }
          }

          await prisma.purchaseRequest.delete({ where: { id: params.id } })
          return { success: true }
        })
        .post('/:id/submit', async ({ params, set }) => {
          const pr = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
          if (!pr) {
            set.status = 404
            return { error: 'Purchase request not found' }
          }
          if (pr.status !== 'DRAFT') {
            set.status = 400
            return { error: 'Only draft purchase requests can be submitted' }
          }

          const updated = await prisma.purchaseRequest.update({
            where: { id: params.id },
            data: { status: 'SUBMITTED' },
            include: prInclude,
          })
          return { pr: updated }
        })
        .post(
          '/:id/approve',
          async ({ params, body, set }) => {
            const pr = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
            if (!pr) {
              set.status = 404
              return { error: 'Purchase request not found' }
            }
            if (pr.status !== 'SUBMITTED') {
              set.status = 400
              return { error: 'Only submitted purchase requests can be approved' }
            }

            const updated = await prisma.purchaseRequest.update({
              where: { id: params.id },
              data: {
                status: 'APPROVED',
                approved_by: body.approvedBy ?? null,
                approved_at: new Date(),
              },
              include: prInclude,
            })
            return { pr: updated }
          },
          {
            body: t.Object({
              approvedBy: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/:id/reject',
          async ({ params, body, set }) => {
            const pr = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
            if (!pr) {
              set.status = 404
              return { error: 'Purchase request not found' }
            }
            if (pr.status !== 'SUBMITTED') {
              set.status = 400
              return { error: 'Only submitted purchase requests can be rejected' }
            }

            const updated = await prisma.purchaseRequest.update({
              where: { id: params.id },
              data: {
                status: 'REJECTED',
                notes: body.reason ? `${pr.notes ?? ''}\nRejection reason: ${body.reason}` : pr.notes,
              },
              include: prInclude,
            })
            return { pr: updated }
          },
          {
            body: t.Object({
              reason: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/:id/convert',
          async ({ params, body, authUser, set }) => {
            const pr = await prisma.purchaseRequest.findUnique({ where: { id: params.id } })
            if (!pr) {
              set.status = 404
              return { error: 'Purchase request not found' }
            }
            if (pr.status !== 'APPROVED') {
              set.status = 400
              return { error: 'Only approved purchase requests can be converted to PO' }
            }

            const now = new Date()
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
            const poPrefix = `PO-${yearMonth}-`
            const poCount = await prisma.purchaseOrder.count({
              where: { po_number: { startsWith: poPrefix } },
            })
            const poNumber = `${poPrefix}${String(poCount + 1).padStart(4, '0')}`

            const prItems = pr.items as Array<{
              item_name: string
              quantity: number
              estimated_unit_price?: number
              description?: string
              unit_of_measure?: string
            }>

            const poItems = prItems.map((item) => ({
              item_name: item.item_name,
              description: item.description,
              quantity: item.quantity,
              unit_of_measure: item.unit_of_measure,
              unit_price: item.estimated_unit_price ?? 0,
              total: item.quantity * (item.estimated_unit_price ?? 0),
            }))

            const subtotal = poItems.reduce((sum, item) => sum + item.total, 0)
            const tax = subtotal * 0.07
            const total = subtotal + tax

            const [updatedPR, po] = await prisma.$transaction([
              prisma.purchaseRequest.update({
                where: { id: params.id },
                data: { status: 'CONVERTED' },
                include: prInclude,
              }),
              prisma.purchaseOrder.create({
                data: {
                  po_number: poNumber,
                  pr_id: params.id,
                  vendor_name: body.vendorName ?? 'TBD',
                  project_id: pr.project_id,
                  items: poItems,
                  subtotal,
                  tax,
                  total,
                  payment_terms: body.paymentTerms ?? null,
                  delivery_date: body.deliveryDate ? new Date(body.deliveryDate) : null,
                  created_by: authUser!.id,
                  notes: `Converted from PR ${pr.pr_number}`,
                },
                include: {
                  project: { select: { id: true, name: true, code: true } },
                  creator: { select: { id: true, first_name: true, last_name: true } },
                  approver: { select: { id: true, first_name: true, last_name: true } },
                  purchase_request: true,
                },
              }),
            ])

            set.status = 201
            return { pr: updatedPR, po }
          },
          {
            body: t.Object({
              vendorName: t.Optional(t.String()),
              paymentTerms: t.Optional(t.String()),
              deliveryDate: t.Optional(t.String()),
            }),
          }
        )
  )
