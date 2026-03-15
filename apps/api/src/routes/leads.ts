import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const
type LeadStatusValue = typeof LEAD_STATUSES[number]

const ALLOWED_LEAD_TRANSITIONS: Record<LeadStatusValue, LeadStatusValue[]> = {
  NEW: ['CONTACTED'],
  CONTACTED: ['QUALIFIED', 'UNQUALIFIED'],
  QUALIFIED: ['CONVERTED', 'UNQUALIFIED'],
  UNQUALIFIED: ['QUALIFIED'],
  CONVERTED: [],
}

const createLeadSchema = t.Object({
  title: t.String({ minLength: 1 }),
  customerId: t.Optional(t.String()),
  contactId: t.Optional(t.String()),
  source: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('NEW'),
      t.Literal('CONTACTED'),
      t.Literal('QUALIFIED'),
      t.Literal('UNQUALIFIED'),
      t.Literal('CONVERTED'),
    ])
  ),
  value: t.Optional(t.Number()),
  probability: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  expectedCloseDate: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
})

const updateLeadSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  customerId: t.Optional(t.String()),
  contactId: t.Optional(t.String()),
  source: t.Optional(t.String()),
  status: t.Optional(
    t.Union([
      t.Literal('NEW'),
      t.Literal('CONTACTED'),
      t.Literal('QUALIFIED'),
      t.Literal('UNQUALIFIED'),
      t.Literal('CONVERTED'),
    ])
  ),
  value: t.Optional(t.Number()),
  probability: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  expectedCloseDate: t.Optional(t.String()),
  notes: t.Optional(t.String()),
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

function isValidLeadTransition(from: LeadStatusValue, to: LeadStatusValue): boolean {
  return ALLOWED_LEAD_TRANSITIONS[from].includes(to)
}

export const leadsRoutes = new Elysia({ prefix: '/api/leads' })
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
              where.title = { contains: query.search, mode: 'insensitive' }
            }

            if (query.status && LEAD_STATUSES.includes(query.status as LeadStatusValue)) {
              where.status = query.status
            }

            if (query.source) {
              where.source = query.source
            }

            if (query.assignedTo) {
              where.assigned_to = query.assignedTo
            }

            const [total, leads] = await Promise.all([
              prisma.lead.count({ where }),
              prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: leads,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              search: t.Optional(t.String()),
              status: t.Optional(t.String()),
              source: t.Optional(t.String()),
              assignedTo: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const lead = await prisma.lead.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true } },
              contact: { select: { id: true, first_name: true, last_name: true, email: true } },
              assignee: { select: { id: true, first_name: true, last_name: true, email: true } },
            },
          })
          if (!lead) {
            set.status = 404
            return { error: 'Lead not found' }
          }
          return { lead }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const lead = await prisma.lead.create({
              data: {
                title: body.title,
                customer_id: body.customerId,
                contact_id: body.contactId,
                source: body.source,
                status: body.status ?? 'NEW',
                value: body.value,
                probability: body.probability,
                expected_close_date: body.expectedCloseDate
                  ? new Date(body.expectedCloseDate)
                  : undefined,
                notes: body.notes,
                assigned_to: body.assignedTo,
              },
            })
            set.status = 201
            return { lead }
          },
          { body: createLeadSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.lead.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Lead not found' }
            }

            if (body.status && body.status !== existing.status) {
              if (!isValidLeadTransition(existing.status as LeadStatusValue, body.status as LeadStatusValue)) {
                set.status = 422
                return {
                  error: `Invalid status transition from ${existing.status} to ${body.status}`,
                }
              }
            }

            const lead = await prisma.lead.update({
              where: { id: params.id },
              data: {
                title: body.title,
                customer_id: body.customerId,
                contact_id: body.contactId,
                source: body.source,
                status: body.status,
                value: body.value,
                probability: body.probability,
                expected_close_date: body.expectedCloseDate
                  ? new Date(body.expectedCloseDate)
                  : undefined,
                notes: body.notes,
                assigned_to: body.assignedTo,
              },
            })
            return { lead }
          },
          { body: updateLeadSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.lead.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Lead not found' }
          }
          await prisma.lead.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
