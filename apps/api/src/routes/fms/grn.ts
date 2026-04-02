import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'
import type { GRNStatus } from '../../../generated/prisma/client'

async function generateGRNNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `GRN-${yearMonth}-`

  const count = await prisma.goodsReceivedNote.count({
    where: { grn_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const grnInclude = {
  project: { select: { id: true, name: true, code: true } },
  receiver: { select: { id: true, first_name: true, last_name: true } },
}

const GRN_STATUSES = ['DRAFT', 'RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED'] as const

const grnItemSchema = t.Object({
  item_id: t.String({ minLength: 1 }),
  item_code: t.String(),
  item_name: t.String(),
  quantity: t.Number({ minimum: 0.001 }),
  unit_cost: t.Optional(t.Nullable(t.Number())),
  unit_of_measure: t.Optional(t.Nullable(t.String())),
})

const createGRNSchema = t.Object({
  supplierName: t.Optional(t.String()),
  items: t.Array(grnItemSchema, { minItems: 1 }),
  receivedDate: t.String({ minLength: 1 }),
  receivedBy: t.Optional(t.String()),
  inspectionNotes: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  poId: t.Optional(t.String()),
  qcStatus: t.Optional(t.String()),
})

const updateGRNSchema = t.Object({
  supplierName: t.Optional(t.String()),
  receivedDate: t.Optional(t.String()),
  receivedBy: t.Optional(t.String()),
  status: t.Optional(t.String()),
  inspectionNotes: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  poId: t.Optional(t.String()),
  qcStatus: t.Optional(t.String()),
})

export const fmsGRNRoutes = new Elysia({ prefix: '/api/fms/grn' })
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
                { grn_number: { contains: query.search, mode: 'insensitive' } },
                { supplier_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, notes] = await Promise.all([
              prisma.goodsReceivedNote.count({ where }),
              prisma.goodsReceivedNote.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: grnInclude,
              }),
            ])

            return { data: notes, pagination: buildPagination(page, limit, total) }
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
          const note = await prisma.goodsReceivedNote.findUnique({
            where: { id: params.id },
            include: grnInclude,
          })
          if (!note) {
            set.status = 404
            return { error: 'GRN not found' }
          }
          return { grn: note }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const grnNumber = await generateGRNNumber()

            let supplierName = body.supplierName ?? ''
            if (body.poId && !supplierName) {
              const po = await prisma.purchaseOrder.findUnique({ where: { id: body.poId } })
              if (po) supplierName = po.vendor_name
            }

            const grn = await prisma.goodsReceivedNote.create({
              data: {
                grn_number: grnNumber,
                supplier_name: supplierName,
                items: body.items as object[],
                received_date: new Date(body.receivedDate),
                received_by: body.receivedBy ?? null,
                inspection_notes: body.inspectionNotes ?? null,
                project_id: body.projectId ?? null,
                po_id: body.poId ?? null,
                qc_status: body.qcStatus ?? null,
                status: 'DRAFT',
              },
              include: grnInclude,
            })

            set.status = 201
            return { grn }
          },
          { body: createGRNSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.goodsReceivedNote.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'GRN not found' }
            }

            if (body.status && !GRN_STATUSES.includes(body.status as typeof GRN_STATUSES[number])) {
              set.status = 400
              return { error: `Invalid status. Must be one of: ${GRN_STATUSES.join(', ')}` }
            }

            const grn = await prisma.goodsReceivedNote.update({
              where: { id: params.id },
              data: {
                supplier_name: body.supplierName,
                received_date: body.receivedDate ? new Date(body.receivedDate) : undefined,
                received_by: body.receivedBy,
                status: body.status as GRNStatus | undefined,
                inspection_notes: body.inspectionNotes,
                project_id: body.projectId,
                po_id: body.poId,
                qc_status: body.qcStatus,
              },
              include: grnInclude,
            })
            return { grn }
          },
          { body: updateGRNSchema }
        )
        .patch(
          '/:id/accept',
          async ({ params, body, set }) => {
            const existing = await prisma.goodsReceivedNote.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'GRN not found' }
            }
            if (existing.status === 'ACCEPTED') {
              set.status = 409
              return { error: 'GRN is already accepted' }
            }

            const items = existing.items as Array<{
              item_id: string
              quantity: number
              unit_of_measure?: string | null
            }>

            const grn = await prisma.$transaction(async (tx) => {
              const updated = await tx.goodsReceivedNote.update({
                where: { id: params.id },
                data: {
                  status: 'ACCEPTED',
                  inspection_notes: body.inspectionNotes ?? existing.inspection_notes,
                },
                include: grnInclude,
              })

              for (const item of items) {
                const inventoryItem = await tx.inventoryItem.findUnique({
                  where: { id: item.item_id },
                })
                if (inventoryItem) {
                  await tx.stockMovement.create({
                    data: {
                      item_id: item.item_id,
                      movement_type: 'RECEIVED',
                      quantity: item.quantity,
                      reference_type: 'GRN',
                      reference_id: existing.id,
                      notes: `GRN: ${existing.grn_number}`,
                      performed_by: existing.received_by,
                    },
                  })

                  await tx.inventoryItem.update({
                    where: { id: item.item_id },
                    data: { current_stock: { increment: item.quantity } },
                  })
                }
              }

              return updated
            })

            return { grn }
          },
          {
            body: t.Object({
              inspectionNotes: t.Optional(t.String()),
            }),
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const grn = await prisma.goodsReceivedNote.findUnique({ where: { id: params.id } })
          if (!grn) {
            set.status = 404
            return { error: 'GRN not found' }
          }
          if (grn.status === 'ACCEPTED') {
            set.status = 409
            return { error: 'Cannot delete an accepted GRN' }
          }

          await prisma.goodsReceivedNote.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
