import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'] as const
const UNIT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE'] as const

const createProjectSchema = t.Object({
  name: t.String({ minLength: 1 }),
  code: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  address: t.Optional(t.String()),
  type: t.String({ minLength: 1 }),
  status: t.Optional(t.Union(PROJECT_STATUSES.map((s) => t.Literal(s)))),
  totalUnits: t.Optional(t.Number({ minimum: 0 })),
  settings: t.Optional(t.Record(t.String(), t.Unknown())),
})

const updateProjectSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  code: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  address: t.Optional(t.String()),
  type: t.Optional(t.String({ minLength: 1 })),
  status: t.Optional(t.Union(PROJECT_STATUSES.map((s) => t.Literal(s)))),
  totalUnits: t.Optional(t.Number({ minimum: 0 })),
  settings: t.Optional(t.Record(t.String(), t.Unknown())),
})

function buildUnitStatusCounts(
  groupResult: Array<{ status: string; _count: { status: number } }>
) {
  const counts = { available: 0, reserved: 0, sold: 0, rented: 0, under_maintenance: 0 }
  for (const row of groupResult) {
    const key = row.status.toLowerCase() as keyof typeof counts
    if (key in counts) {
      counts[key] = row._count.status
    }
  }
  return counts
}

export const projectsRoutes = new Elysia({ prefix: '/api/projects' })
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
        .get('/', async ({ query }) => {
          const page = Math.max(1, Number(query.page ?? 1))
          const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
          const skip = (page - 1) * limit

          const where: Record<string, unknown> = {}
          if (query.search) {
            where.OR = [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ]
          }
          if (query.status) {
            where.status = query.status
          }
          if (query.type) {
            where.type = query.type
          }

          const [total, projects] = await Promise.all([
            prisma.project.count({ where }),
            prisma.project.findMany({
              where,
              skip,
              take: limit,
              orderBy: { created_at: 'desc' },
              include: { _count: { select: { units: true } } },
            }),
          ])

          return {
            data: projects,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          }
        })
        .get('/:id', async ({ params, set }) => {
          const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: { _count: { select: { units: true } } },
          })
          if (!project) {
            set.status = 404
            return { error: 'Project not found' }
          }

          const unitStatusGroups = await prisma.unit.groupBy({
            by: ['status'],
            where: { project_id: params.id },
            _count: { status: true },
          })

          return { project: { ...project, unitStatusCounts: buildUnitStatusCounts(unitStatusGroups) } }
        })
        .get('/:id/dashboard', async ({ params, set }) => {
          const project = await prisma.project.findUnique({ where: { id: params.id } })
          if (!project) {
            set.status = 404
            return { error: 'Project not found' }
          }

          const [unitStatusGroups, revenueAggregate] = await Promise.all([
            prisma.unit.groupBy({
              by: ['status'],
              where: { project_id: params.id },
              _count: { status: true },
            }),
            prisma.unit.aggregate({
              where: { project_id: params.id },
              _sum: { price: true },
            }),
          ])

          const unitStatusCounts = buildUnitStatusCounts(unitStatusGroups)
          const totalUnits = Object.values(unitStatusCounts).reduce((a, b) => a + b, 0)
          const occupiedCount = unitStatusCounts.rented + unitStatusCounts.sold
          const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0

          return {
            dashboard: {
              totalUnits,
              unitStatusCounts,
              occupancyRate,
              totalRevenuePotential: revenueAggregate._sum.price ?? 0,
            },
          }
        })
        .get('/:id/units', async ({ params, query, set }) => {
          const project = await prisma.project.findUnique({ where: { id: params.id } })
          if (!project) {
            set.status = 404
            return { error: 'Project not found' }
          }

          const page = Math.max(1, Number(query.page ?? 1))
          const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
          const skip = (page - 1) * limit

          const where: Record<string, unknown> = { project_id: params.id }
          if (query.status) where.status = query.status
          if (query.type) where.type = query.type
          if (query.floor !== undefined) where.floor = Number(query.floor)
          if (query.minArea !== undefined || query.maxArea !== undefined) {
            where.area_sqm = {}
            if (query.minArea !== undefined) (where.area_sqm as Record<string, unknown>).gte = Number(query.minArea)
            if (query.maxArea !== undefined) (where.area_sqm as Record<string, unknown>).lte = Number(query.maxArea)
          }
          if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            where.price = {}
            if (query.minPrice !== undefined) (where.price as Record<string, unknown>).gte = Number(query.minPrice)
            if (query.maxPrice !== undefined) (where.price as Record<string, unknown>).lte = Number(query.maxPrice)
          }

          const [total, units] = await Promise.all([
            prisma.unit.count({ where }),
            prisma.unit.findMany({
              where,
              skip,
              take: limit,
              orderBy: [{ floor: 'asc' }, { unit_number: 'asc' }],
              include: { project: { select: { id: true, name: true, code: true } } },
            }),
          ])

          return {
            data: units,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const existing = await prisma.project.findUnique({ where: { code: body.code } })
            if (existing) {
              set.status = 409
              return { error: 'Project code already exists' }
            }

            const project = await prisma.project.create({
              data: {
                name: body.name,
                code: body.code,
                description: body.description,
                address: body.address,
                type: body.type,
                status: body.status ?? 'ACTIVE',
                total_units: body.totalUnits ?? 0,
                settings: body.settings ?? {},
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Project',
              entityId: project.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { project }
          },
          { body: createProjectSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.project.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Project not found' }
            }

            if (body.code && body.code !== existing.code) {
              const codeConflict = await prisma.project.findUnique({ where: { code: body.code } })
              if (codeConflict) {
                set.status = 409
                return { error: 'Project code already exists' }
              }
            }

            const project = await prisma.project.update({
              where: { id: params.id },
              data: {
                name: body.name,
                code: body.code,
                description: body.description,
                address: body.address,
                type: body.type,
                status: body.status,
                total_units: body.totalUnits,
                settings: body.settings,
              },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Project',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })
            return { project }
          },
          { body: updateProjectSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.project.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Project not found' }
          }

          const project = await prisma.project.update({
            where: { id: params.id },
            data: { status: 'SUSPENDED' },
          })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Project',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { project }
        })
  )

export type ProjectsRoutes = typeof projectsRoutes
