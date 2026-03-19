import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { getUserAggregatedPermissions } from '../middleware/permissions'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const CONTRACT_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'CANCELLED',
] as const
type ContractStatusValue = (typeof CONTRACT_STATUSES)[number]

const CONTRACT_TYPES = ['SALE', 'LEASE', 'RENTAL'] as const

const APPROVABLE_STATUSES: ContractStatusValue[] = ['PENDING_APPROVAL', 'APPROVED']

const APPROVAL_TRANSITIONS: Record<ContractStatusValue, ContractStatusValue | null> = {
  DRAFT: null,
  PENDING_APPROVAL: 'APPROVED',
  APPROVED: 'ACTIVE',
  ACTIVE: null,
  EXPIRED: null,
  TERMINATED: null,
  CANCELLED: null,
}

const contractTypeUnion = t.Union([
  t.Literal('SALE'),
  t.Literal('LEASE'),
  t.Literal('RENTAL'),
])

const contractStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('PENDING_APPROVAL'),
  t.Literal('APPROVED'),
  t.Literal('ACTIVE'),
  t.Literal('EXPIRED'),
  t.Literal('TERMINATED'),
  t.Literal('CANCELLED'),
])

const createContractSchema = t.Object({
  contractNumber: t.Optional(t.String()),
  customerId: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  unitId: t.Optional(t.String()),
  quotationId: t.Optional(t.String()),
  type: contractTypeUnion,
  startDate: t.String({ minLength: 1 }),
  endDate: t.Optional(t.String()),
  value: t.Optional(t.Number()),
  monthlyRent: t.Optional(t.Number()),
  depositAmount: t.Optional(t.Number()),
  terms: t.Optional(t.String()),
  status: t.Optional(contractStatusUnion),
})

const updateContractSchema = t.Object({
  contractNumber: t.Optional(t.String()),
  customerId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  quotationId: t.Optional(t.String()),
  type: t.Optional(contractTypeUnion),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  value: t.Optional(t.Number()),
  monthlyRent: t.Optional(t.Number()),
  depositAmount: t.Optional(t.Number()),
  terms: t.Optional(t.String()),
  status: t.Optional(contractStatusUnion),
})

const rejectContractSchema = t.Object({
  reason: t.String({ minLength: 1 }),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function generateContractNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `CT-${yearMonth}-`

  const count = await prisma.contract.count({
    where: {
      contract_number: { startsWith: prefix },
    },
  })

  const sequence = String(count + 1).padStart(4, '0')
  return `${prefix}${sequence}`
}

const contractIncludes = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  project: { select: { id: true, name: true, code: true } },
  unit: { select: { id: true, unit_number: true, floor: true, building: true } },
  quotation: { select: { id: true, quotation_number: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

export const contractsRoutes = new Elysia({ prefix: '/api/contracts' })
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
        .get('/pending', async () => {
          const contracts = await prisma.contract.findMany({
            where: { status: 'PENDING_APPROVAL' },
            orderBy: { created_at: 'desc' },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              project: { select: { id: true, name: true, code: true } },
            },
          })
          return { data: contracts }
        })
        .get(
          '/expiring',
          async ({ query }) => {
            const days = Math.max(1, Number(query.days ?? 30))
            const now = new Date()
            const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

            const contracts = await prisma.contract.findMany({
              where: {
                status: 'ACTIVE',
                end_date: {
                  gte: now,
                  lte: cutoff,
                },
              },
              orderBy: { end_date: 'asc' },
              include: {
                customer: { select: { id: true, name: true, email: true, phone: true } },
                project: { select: { id: true, name: true, code: true } },
              },
            })
            return { data: contracts }
          },
          {
            query: t.Object({
              days: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.status && CONTRACT_STATUSES.includes(query.status as ContractStatusValue)) {
              where.status = query.status
            }

            if (query.type && CONTRACT_TYPES.includes(query.type as (typeof CONTRACT_TYPES)[number])) {
              where.type = query.type
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.projectId) {
              where.project_id = query.projectId
            }

            const [total, contracts] = await Promise.all([
              prisma.contract.count({ where }),
              prisma.contract.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: contracts,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              type: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const contract = await prisma.contract.findUnique({
            where: { id: params.id },
            include: contractIncludes,
          })
          if (!contract) {
            set.status = 404
            return { error: 'Contract not found' }
          }
          return { contract }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser
            const contractNumber = body.contractNumber || (await generateContractNumber())

            const contract = await prisma.contract.create({
              data: {
                contract_number: contractNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                unit_id: body.unitId ?? null,
                quotation_id: body.quotationId ?? null,
                type: body.type,
                start_date: new Date(body.startDate),
                end_date: body.endDate ? new Date(body.endDate) : null,
                value: body.value ?? 0,
                monthly_rent: body.monthlyRent ?? null,
                deposit_amount: body.depositAmount ?? null,
                terms: body.terms ?? null,
                status: body.status ?? 'DRAFT',
                created_by: user.id,
              },
            })
            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'Contract',
              entityId: contract.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { contract }
          },
          { body: createContractSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.contract.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contract not found' }
            }

            const contract = await prisma.contract.update({
              where: { id: params.id },
              data: {
                contract_number: body.contractNumber,
                customer_id: body.customerId,
                project_id: body.projectId,
                unit_id: body.unitId,
                quotation_id: body.quotationId,
                type: body.type,
                start_date: body.startDate ? new Date(body.startDate) : undefined,
                end_date:
                  body.endDate !== undefined
                    ? body.endDate
                      ? new Date(body.endDate)
                      : null
                    : undefined,
                value: body.value,
                monthly_rent: body.monthlyRent,
                deposit_amount: body.depositAmount,
                terms: body.terms,
                status: body.status,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Contract',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })
            return { contract }
          },
          { body: updateContractSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.contract.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Contract not found' }
          }
          if (existing.status !== 'DRAFT') {
            set.status = 409
            return { error: 'Only DRAFT contracts can be deleted' }
          }
          await prisma.contract.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Contract',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
        .guard(
          {
            async beforeHandle({ authUser, set }) {
              const perms = await getUserAggregatedPermissions(
                (authUser as AuthenticatedUser).id
              )
              if (!perms['contracts.approve']) {
                set.status = 403
                return { error: 'Forbidden' }
              }
            },
          },
          (inner) =>
            inner
              .post('/:id/approve', async ({ params, authUser, headers, set }) => {
                const contract = await prisma.contract.findUnique({ where: { id: params.id } })
                if (!contract) {
                  set.status = 404
                  return { error: 'Contract not found' }
                }
                if (!APPROVABLE_STATUSES.includes(contract.status as ContractStatusValue)) {
                  set.status = 409
                  return { error: 'Contract cannot be approved in its current status' }
                }
                const nextStatus = APPROVAL_TRANSITIONS[contract.status as ContractStatusValue]
                if (!nextStatus) {
                  set.status = 409
                  return { error: 'Contract cannot be approved in its current status' }
                }
                const user = authUser as AuthenticatedUser
                const updated = await prisma.contract.update({
                  where: { id: params.id },
                  data: {
                    status: nextStatus,
                    approved_by: user.id,
                  },
                })
                logActivity({
                  userId: user.id,
                  action: 'UPDATE',
                  entityType: 'Contract',
                  entityId: params.id,
                  ipAddress: getIpAddress(headers),
                })
                return { contract: updated }
              })
              .post(
                '/:id/reject',
                async ({ params, body, authUser, headers, set }) => {
                  const contract = await prisma.contract.findUnique({
                    where: { id: params.id },
                  })
                  if (!contract) {
                    set.status = 404
                    return { error: 'Contract not found' }
                  }
                  if (!APPROVABLE_STATUSES.includes(contract.status as ContractStatusValue)) {
                    set.status = 409
                    return { error: 'Contract cannot be rejected in its current status' }
                  }
                  const updated = await prisma.contract.update({
                    where: { id: params.id },
                    data: {
                      status: 'CANCELLED',
                      terms: body.reason,
                    },
                  })
                  logActivity({
                    userId: (authUser as AuthenticatedUser).id,
                    action: 'UPDATE',
                    entityType: 'Contract',
                    entityId: params.id,
                    ipAddress: getIpAddress(headers),
                  })
                  return { contract: updated }
                },
                { body: rejectContractSchema }
              )
        )
  )
