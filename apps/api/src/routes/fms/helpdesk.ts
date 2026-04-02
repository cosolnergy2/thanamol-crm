import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

type TicketStatusValue = (typeof TICKET_STATUSES)[number]
type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number]

async function generateWONumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `WO-${yearMonth}-`
  const count = await prisma.workOrder.count({ where: { wo_number: { startsWith: prefix } } })
  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const helpdeskInclude = {
  project: { select: { id: true, name: true, code: true } },
  requester: { select: { id: true, first_name: true, last_name: true } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
}

const createHelpdeskTicketSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  site: t.Optional(t.String()),
  requesterId: t.Optional(t.String()),
  category: t.Optional(t.String()),
  priority: t.Optional(
    t.Union([t.Literal('LOW'), t.Literal('MEDIUM'), t.Literal('HIGH'), t.Literal('URGENT')]),
  ),
  assignedTo: t.Optional(t.String()),
})

const updateHelpdeskTicketSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  site: t.Optional(t.String()),
  requesterId: t.Optional(t.String()),
  category: t.Optional(t.String()),
  priority: t.Optional(
    t.Union([t.Literal('LOW'), t.Literal('MEDIUM'), t.Literal('HIGH'), t.Literal('URGENT')]),
  ),
  status: t.Optional(
    t.Union([
      t.Literal('OPEN'),
      t.Literal('IN_PROGRESS'),
      t.Literal('RESOLVED'),
      t.Literal('CLOSED'),
    ]),
  ),
  assignedTo: t.Optional(t.String()),
  resolutionNotes: t.Optional(t.String()),
})

const patchStatusSchema = t.Object({
  status: t.Union([
    t.Literal('OPEN'),
    t.Literal('IN_PROGRESS'),
    t.Literal('RESOLVED'),
    t.Literal('CLOSED'),
  ]),
})

const createWorkOrderFromTicketSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  createdBy: t.String({ minLength: 1 }),
  title: t.Optional(t.String()),
  description: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
  priority: t.Optional(t.String()),
})

export const fmsHelpdeskRoutes = new Elysia({ prefix: '/api/fms/helpdesk' })
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
            if (query.status && TICKET_STATUSES.includes(query.status as TicketStatusValue)) {
              where.status = query.status
            }
            if (query.priority && TICKET_PRIORITIES.includes(query.priority as TicketPriorityValue)) {
              where.priority = query.priority
            }
            if (query.site) where.site = query.site

            const [total, tickets] = await Promise.all([
              prisma.ticket.count({ where }),
              prisma.ticket.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: helpdeskInclude,
              }),
            ])

            return { data: tickets, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              priority: t.Optional(t.String()),
              site: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: helpdeskInclude,
          })
          if (!ticket) {
            set.status = 404
            return { error: 'Ticket not found' }
          }
          return { ticket }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const ticket = await prisma.ticket.create({
              data: {
                title: body.title,
                description: body.description ?? null,
                project_id: body.projectId ?? null,
                site: body.site ?? null,
                requester_id: body.requesterId ?? null,
                category: body.category ?? null,
                priority: body.priority ?? 'MEDIUM',
                status: 'OPEN',
                assigned_to: body.assignedTo ?? null,
              },
              include: helpdeskInclude,
            })
            set.status = 201
            return { ticket }
          },
          { body: createHelpdeskTicketSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.ticket.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Ticket not found' }
            }

            const wasResolved = existing.status === 'RESOLVED' || existing.status === 'CLOSED'
            const isNowResolved = body.status === 'RESOLVED' || body.status === 'CLOSED'
            const resolvedAt = !wasResolved && isNowResolved ? new Date() : existing.resolved_at

            const ticket = await prisma.ticket.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                project_id: body.projectId,
                site: body.site,
                requester_id: body.requesterId,
                category: body.category,
                priority: body.priority,
                status: body.status,
                assigned_to: body.assignedTo,
                resolved_at: resolvedAt,
                resolution_notes: body.resolutionNotes,
              },
              include: helpdeskInclude,
            })
            return { ticket }
          },
          { body: updateHelpdeskTicketSchema },
        )
        .patch(
          '/:id/status',
          async ({ params, body, set }) => {
            const existing = await prisma.ticket.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Ticket not found' }
            }

            const wasResolved = existing.status === 'RESOLVED' || existing.status === 'CLOSED'
            const isNowResolved = body.status === 'RESOLVED' || body.status === 'CLOSED'
            const resolvedAt = !wasResolved && isNowResolved ? new Date() : existing.resolved_at

            const ticket = await prisma.ticket.update({
              where: { id: params.id },
              data: { status: body.status, resolved_at: resolvedAt },
              include: helpdeskInclude,
            })
            return { ticket }
          },
          { body: patchStatusSchema },
        )
        .post(
          '/:id/create-work-order',
          async ({ params, body, set }) => {
            const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
            if (!ticket) {
              set.status = 404
              return { error: 'Ticket not found' }
            }

            if (ticket.work_order_id) {
              set.status = 409
              return { error: 'A work order already exists for this ticket' }
            }

            const woNumber = await generateWONumber()
            const workOrder = await prisma.workOrder.create({
              data: {
                wo_number: woNumber,
                title: body.title ?? ticket.title,
                description: body.description ?? ticket.description ?? null,
                type: 'CORRECTIVE',
                priority: body.priority ?? ticket.priority ?? 'MEDIUM',
                project_id: body.projectId,
                assigned_to: body.assignedTo ?? null,
                created_by: body.createdBy,
              },
            })

            const updatedTicket = await prisma.ticket.update({
              where: { id: params.id },
              data: {
                work_order_id: workOrder.id,
                status: 'IN_PROGRESS',
              },
              include: helpdeskInclude,
            })

            set.status = 201
            return { workOrder, ticket: updatedTicket }
          },
          { body: createWorkOrderFromTicketSchema },
        ),
  )
