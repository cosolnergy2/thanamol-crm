import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

async function generateIssueNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `SI-${yearMonth}-`

  const count = await prisma.stockIssue.count({
    where: { issue_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const stockIssueInclude = {
  project: { select: { id: true, name: true, code: true } },
  issued_to_user: { select: { id: true, first_name: true, last_name: true } },
  issuer: { select: { id: true, first_name: true, last_name: true } },
}

const issueItemSchema = t.Object({
  item_id: t.String({ minLength: 1 }),
  item_code: t.String(),
  item_name: t.String(),
  quantity: t.Number({ minimum: 0.001 }),
  unit_cost: t.Optional(t.Nullable(t.Number())),
  unit_of_measure: t.Optional(t.Nullable(t.String())),
})

const createIssueSchema = t.Object({
  workOrderId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  items: t.Array(issueItemSchema, { minItems: 1 }),
  issuedTo: t.Optional(t.String()),
  issuedBy: t.Optional(t.String()),
  issueDate: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
})

const updateIssueSchema = t.Object({
  workOrderId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  issuedTo: t.Optional(t.String()),
  issuedBy: t.Optional(t.String()),
  issueDate: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const fmsStockIssuesRoutes = new Elysia({ prefix: '/api/fms/stock-issues' })
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
            if (query.search) {
              where.OR = [
                { issue_number: { contains: query.search, mode: 'insensitive' } },
                { notes: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, issues] = await Promise.all([
              prisma.stockIssue.count({ where }),
              prisma.stockIssue.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: stockIssueInclude,
              }),
            ])

            return { data: issues, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const issue = await prisma.stockIssue.findUnique({
            where: { id: params.id },
            include: stockIssueInclude,
          })
          if (!issue) {
            set.status = 404
            return { error: 'Stock issue not found' }
          }
          return { issue }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const issueNumber = await generateIssueNumber()

            const issue = await prisma.$transaction(async (tx) => {
              const created = await tx.stockIssue.create({
                data: {
                  issue_number: issueNumber,
                  work_order_id: body.workOrderId ?? null,
                  project_id: body.projectId ?? null,
                  items: body.items as object[],
                  issued_to: body.issuedTo ?? null,
                  issued_by: body.issuedBy ?? null,
                  issue_date: new Date(body.issueDate),
                  notes: body.notes ?? null,
                },
                include: stockIssueInclude,
              })

              for (const item of body.items) {
                const inventoryItem = await tx.inventoryItem.findUnique({
                  where: { id: item.item_id },
                })
                if (inventoryItem) {
                  await tx.stockMovement.create({
                    data: {
                      item_id: item.item_id,
                      movement_type: 'ISSUED',
                      quantity: item.quantity,
                      reference_type: 'StockIssue',
                      reference_id: created.id,
                      notes: `Stock Issue: ${issueNumber}`,
                      performed_by: body.issuedBy ?? null,
                    },
                  })

                  await tx.inventoryItem.update({
                    where: { id: item.item_id },
                    data: { current_stock: { decrement: item.quantity } },
                  })
                }
              }

              return created
            })

            set.status = 201
            return { issue }
          },
          { body: createIssueSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.stockIssue.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Stock issue not found' }
            }

            const issue = await prisma.stockIssue.update({
              where: { id: params.id },
              data: {
                work_order_id: body.workOrderId,
                project_id: body.projectId,
                issued_to: body.issuedTo,
                issued_by: body.issuedBy,
                issue_date: body.issueDate ? new Date(body.issueDate) : undefined,
                notes: body.notes,
              },
              include: stockIssueInclude,
            })
            return { issue }
          },
          { body: updateIssueSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const issue = await prisma.stockIssue.findUnique({ where: { id: params.id } })
          if (!issue) {
            set.status = 404
            return { error: 'Stock issue not found' }
          }

          await prisma.stockIssue.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
