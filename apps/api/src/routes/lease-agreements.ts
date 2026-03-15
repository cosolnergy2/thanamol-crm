import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const LEASE_STATUSES = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const

const leaseStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('ACTIVE'),
  t.Literal('EXPIRED'),
  t.Literal('TERMINATED'),
])

const createLeaseAgreementSchema = t.Object({
  contractId: t.String({ minLength: 1 }),
  leaseTerms: t.Optional(t.Record(t.String(), t.Any())),
  specialConditions: t.Optional(t.String()),
  status: t.Optional(leaseStatusUnion),
})

const updateLeaseAgreementSchema = t.Object({
  leaseTerms: t.Optional(t.Record(t.String(), t.Any())),
  specialConditions: t.Optional(t.String()),
  status: t.Optional(leaseStatusUnion),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const leaseAgreementsRoutes = new Elysia({ prefix: '/api/lease-agreements' })
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

            if (query.contractId) {
              where.contract_id = query.contractId
            }

            if (
              query.status &&
              LEASE_STATUSES.includes(query.status as (typeof LEASE_STATUSES)[number])
            ) {
              where.status = query.status
            }

            const [total, agreements] = await Promise.all([
              prisma.leaseAgreement.count({ where }),
              prisma.leaseAgreement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  contract: {
                    select: {
                      id: true,
                      contract_number: true,
                      type: true,
                      status: true,
                    },
                  },
                },
              }),
            ])

            return {
              data: agreements,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              contractId: t.Optional(t.String()),
              status: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const agreement = await prisma.leaseAgreement.findUnique({
            where: { id: params.id },
            include: {
              contract: {
                select: {
                  id: true,
                  contract_number: true,
                  type: true,
                  status: true,
                  customer_id: true,
                  project_id: true,
                },
              },
            },
          })
          if (!agreement) {
            set.status = 404
            return { error: 'Lease agreement not found' }
          }
          return { leaseAgreement: agreement }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const contractExists = await prisma.contract.findUnique({
              where: { id: body.contractId },
            })
            if (!contractExists) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            const leaseAgreement = await prisma.leaseAgreement.create({
              data: {
                contract_id: body.contractId,
                lease_terms: (body.leaseTerms as object) ?? {},
                special_conditions: body.specialConditions ?? null,
                status: body.status ?? 'DRAFT',
              },
            })
            set.status = 201
            return { leaseAgreement }
          },
          { body: createLeaseAgreementSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.leaseAgreement.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Lease agreement not found' }
            }

            const leaseAgreement = await prisma.leaseAgreement.update({
              where: { id: params.id },
              data: {
                lease_terms: body.leaseTerms !== undefined ? (body.leaseTerms as object) : undefined,
                special_conditions: body.specialConditions,
                status: body.status,
              },
            })
            return { leaseAgreement }
          },
          { body: updateLeaseAgreementSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.leaseAgreement.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Lease agreement not found' }
          }
          await prisma.leaseAgreement.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
