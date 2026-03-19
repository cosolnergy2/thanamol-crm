import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const WAREHOUSE_STATUSES = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED'] as const
type WarehouseStatusValue = (typeof WAREHOUSE_STATUSES)[number]

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

const createWarehouseRequirementSchema = t.Object({
  customerId: t.String({ minLength: 1 }),
  projectId: t.Optional(t.String()),
  requirements: t.Optional(t.Record(t.String(), t.Unknown())),
  specifications: t.Optional(t.Record(t.String(), t.Unknown())),
  status: t.Optional(
    t.Union([
      t.Literal('DRAFT'),
      t.Literal('SUBMITTED'),
      t.Literal('REVIEWED'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
    ])
  ),
})

const updateWarehouseRequirementSchema = t.Object({
  customerId: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  requirements: t.Optional(t.Record(t.String(), t.Unknown())),
  specifications: t.Optional(t.Record(t.String(), t.Unknown())),
  status: t.Optional(
    t.Union([
      t.Literal('DRAFT'),
      t.Literal('SUBMITTED'),
      t.Literal('REVIEWED'),
      t.Literal('APPROVED'),
      t.Literal('REJECTED'),
    ])
  ),
})

const warehouseIncludes = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  project: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, first_name: true, last_name: true } },
}

export const warehouseRequirementsRoutes = new Elysia({
  prefix: '/api/warehouse-requirements',
})
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

            if (
              query.status &&
              WAREHOUSE_STATUSES.includes(query.status as WarehouseStatusValue)
            ) {
              where.status = query.status
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.projectId) {
              where.project_id = query.projectId
            }

            const [total, items] = await Promise.all([
              prisma.warehouseRequirement.count({ where }),
              prisma.warehouseRequirement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: warehouseIncludes,
              }),
            ])

            return {
              data: items,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              projectId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const item = await prisma.warehouseRequirement.findUnique({
            where: { id: params.id },
            include: warehouseIncludes,
          })
          if (!item) {
            set.status = 404
            return { error: 'Warehouse requirement not found' }
          }
          return { warehouseRequirement: item }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser
            const item = await prisma.warehouseRequirement.create({
              data: {
                customer_id: body.customerId,
                project_id: body.projectId ?? null,
                requirements: (body.requirements as object) ?? {},
                specifications: (body.specifications as object) ?? {},
                status: body.status ?? 'DRAFT',
                created_by: user.id,
              },
              include: warehouseIncludes,
            })
            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'WarehouseRequirement',
              entityId: item.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { warehouseRequirement: item }
          },
          { body: createWarehouseRequirementSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.warehouseRequirement.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Warehouse requirement not found' }
            }
            const item = await prisma.warehouseRequirement.update({
              where: { id: params.id },
              data: {
                customer_id: body.customerId,
                project_id: body.projectId,
                requirements: body.requirements as object | undefined,
                specifications: body.specifications as object | undefined,
                status: body.status,
              },
              include: warehouseIncludes,
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'WarehouseRequirement',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })
            return { warehouseRequirement: item }
          },
          { body: updateWarehouseRequirementSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.warehouseRequirement.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Warehouse requirement not found' }
          }
          if (existing.status !== 'DRAFT') {
            set.status = 409
            return { error: 'Only DRAFT warehouse requirements can be deleted' }
          }
          await prisma.warehouseRequirement.delete({ where: { id: params.id } })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'WarehouseRequirement',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { success: true }
        })
  )
