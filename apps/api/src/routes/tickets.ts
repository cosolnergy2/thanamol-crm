import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

type TicketStatusValue = (typeof TICKET_STATUSES)[number]
type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number]

const createTicketSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
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
})

const updateTicketSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
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
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const ticketsRoutes = new Elysia({ prefix: '/api/tickets' })
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

            if (query.status && TICKET_STATUSES.includes(query.status as TicketStatusValue)) {
              where.status = query.status
            }

            if (query.priority && TICKET_PRIORITIES.includes(query.priority as TicketPriorityValue)) {
              where.priority = query.priority
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.assignedTo) {
              where.assigned_to = query.assignedTo
            }

            const [total, tickets] = await Promise.all([
              prisma.ticket.count({ where }),
              prisma.ticket.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: tickets,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              priority: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              assignedTo: t.Optional(t.String()),
            }),
          },
        )
        .get('/:id', async ({ params, set }) => {
          const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              unit: { select: { id: true, unit_number: true, floor: true, building: true } },
              assignee: { select: { id: true, first_name: true, last_name: true } },
            },
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
            const resolvedAt =
              body.status === 'RESOLVED' || body.status === 'CLOSED' ? new Date() : undefined

            const ticket = await prisma.ticket.create({
              data: {
                title: body.title,
                description: body.description,
                customer_id: body.customerId,
                unit_id: body.unitId,
                category: body.category,
                priority: body.priority ?? 'MEDIUM',
                status: body.status ?? 'OPEN',
                assigned_to: body.assignedTo,
                resolved_at: resolvedAt,
              },
            })
            set.status = 201
            return { ticket }
          },
          { body: createTicketSchema },
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
            const resolvedAt =
              !wasResolved && isNowResolved ? new Date() : existing.resolved_at

            const ticket = await prisma.ticket.update({
              where: { id: params.id },
              data: {
                title: body.title,
                description: body.description,
                customer_id: body.customerId,
                unit_id: body.unitId,
                category: body.category,
                priority: body.priority,
                status: body.status,
                assigned_to: body.assignedTo,
                resolved_at: resolvedAt,
              },
            })
            return { ticket }
          },
          { body: updateTicketSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.ticket.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Ticket not found' }
          }
          await prisma.ticket.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
