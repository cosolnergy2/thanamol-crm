import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const DEAL_STAGES = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const
type DealStageValue = typeof DEAL_STAGES[number]

const ALLOWED_DEAL_TRANSITIONS: Record<DealStageValue, DealStageValue[]> = {
  PROSPECTING: ['QUALIFICATION', 'CLOSED_LOST'],
  QUALIFICATION: ['PROPOSAL', 'CLOSED_LOST'],
  PROPOSAL: ['NEGOTIATION', 'CLOSED_LOST'],
  NEGOTIATION: ['CLOSED_WON', 'CLOSED_LOST'],
  CLOSED_WON: [],
  CLOSED_LOST: ['PROSPECTING'],
}

const createDealSchema = t.Object({
  title: t.String({ minLength: 1 }),
  customerId: t.Optional(t.String()),
  leadId: t.Optional(t.String()),
  stage: t.Optional(
    t.Union([
      t.Literal('PROSPECTING'),
      t.Literal('QUALIFICATION'),
      t.Literal('PROPOSAL'),
      t.Literal('NEGOTIATION'),
      t.Literal('CLOSED_WON'),
      t.Literal('CLOSED_LOST'),
    ])
  ),
  value: t.Optional(t.Number()),
  probability: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  expectedCloseDate: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  assignedTo: t.Optional(t.String()),
})

const updateDealSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  customerId: t.Optional(t.String()),
  leadId: t.Optional(t.String()),
  stage: t.Optional(
    t.Union([
      t.Literal('PROSPECTING'),
      t.Literal('QUALIFICATION'),
      t.Literal('PROPOSAL'),
      t.Literal('NEGOTIATION'),
      t.Literal('CLOSED_WON'),
      t.Literal('CLOSED_LOST'),
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

function isValidDealTransition(from: DealStageValue, to: DealStageValue): boolean {
  return ALLOWED_DEAL_TRANSITIONS[from].includes(to)
}

export const dealsRoutes = new Elysia({ prefix: '/api/deals' })
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

            if (query.stage && DEAL_STAGES.includes(query.stage as DealStageValue)) {
              where.stage = query.stage
            }

            if (query.assignedTo) {
              where.assigned_to = query.assignedTo
            }

            const [total, deals] = await Promise.all([
              prisma.deal.count({ where }),
              prisma.deal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: deals,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              stage: t.Optional(t.String()),
              assignedTo: t.Optional(t.String()),
            }),
          }
        )
        .get('/pipeline', async () => {
          const [groupedDeals, allDeals] = await Promise.all([
            prisma.deal.groupBy({
              by: ['stage'],
              _count: { _all: true },
              _sum: { value: true },
            }),
            prisma.deal.findMany({ orderBy: { created_at: 'desc' } }),
          ])

          const dealsByStage = allDeals.reduce<Record<string, typeof allDeals>>(
            (acc, deal) => {
              if (!acc[deal.stage]) acc[deal.stage] = []
              acc[deal.stage].push(deal)
              return acc
            },
            {}
          )

          const pipeline = DEAL_STAGES.map((stage) => {
            const group = groupedDeals.find((g) => g.stage === stage)
            return {
              stage,
              deals: dealsByStage[stage] ?? [],
              count: group?._count._all ?? 0,
              totalValue: group?._sum.value ?? 0,
            }
          })

          return { pipeline }
        })
        .get('/:id', async ({ params, set }) => {
          const deal = await prisma.deal.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true } },
              lead: { select: { id: true, title: true, status: true } },
              assignee: { select: { id: true, first_name: true, last_name: true, email: true } },
            },
          })
          if (!deal) {
            set.status = 404
            return { error: 'Deal not found' }
          }
          return { deal }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const deal = await prisma.deal.create({
              data: {
                title: body.title,
                customer_id: body.customerId,
                lead_id: body.leadId,
                stage: body.stage ?? 'PROSPECTING',
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
            return { deal }
          },
          { body: createDealSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.deal.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Deal not found' }
            }

            if (body.stage && body.stage !== existing.stage) {
              if (!isValidDealTransition(existing.stage as DealStageValue, body.stage as DealStageValue)) {
                set.status = 422
                return {
                  error: `Invalid stage transition from ${existing.stage} to ${body.stage}`,
                }
              }
            }

            const deal = await prisma.deal.update({
              where: { id: params.id },
              data: {
                title: body.title,
                customer_id: body.customerId,
                lead_id: body.leadId,
                stage: body.stage,
                value: body.value,
                probability: body.probability,
                expected_close_date: body.expectedCloseDate
                  ? new Date(body.expectedCloseDate)
                  : undefined,
                notes: body.notes,
                assigned_to: body.assignedTo,
              },
            })
            return { deal }
          },
          { body: updateDealSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.deal.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Deal not found' }
          }
          await prisma.deal.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
