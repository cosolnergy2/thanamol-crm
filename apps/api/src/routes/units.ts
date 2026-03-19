import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const UNIT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE'] as const

const createUnitSchema = t.Object({
  projectId: t.String({ minLength: 1 }),
  unitNumber: t.String({ minLength: 1 }),
  floor: t.Optional(t.Number()),
  building: t.Optional(t.String()),
  type: t.String({ minLength: 1 }),
  areaSqm: t.Optional(t.Number({ minimum: 0 })),
  price: t.Optional(t.Number({ minimum: 0 })),
  status: t.Optional(t.Union(UNIT_STATUSES.map((s) => t.Literal(s)))),
  features: t.Optional(t.Record(t.String(), t.Unknown())),
})

const updateUnitSchema = t.Object({
  unitNumber: t.Optional(t.String({ minLength: 1 })),
  floor: t.Optional(t.Number()),
  building: t.Optional(t.String()),
  type: t.Optional(t.String({ minLength: 1 })),
  areaSqm: t.Optional(t.Number({ minimum: 0 })),
  price: t.Optional(t.Number({ minimum: 0 })),
  status: t.Optional(t.Union(UNIT_STATUSES.map((s) => t.Literal(s)))),
  features: t.Optional(t.Record(t.String(), t.Unknown())),
})

export const unitsRoutes = new Elysia({ prefix: '/api/units' })
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
        .get('/availability', async ({ query }) => {
          const where: Record<string, unknown> = {}
          if (query.projectId) where.project_id = query.projectId

          const units = await prisma.unit.findMany({
            where,
            orderBy: [{ project_id: 'asc' }, { floor: 'asc' }, { unit_number: 'asc' }],
            include: { project: { select: { id: true, name: true, code: true } } },
          })

          const byProject = new Map<
            string,
            { projectId: string; projectName: string; projectCode: string; units: unknown[] }
          >()

          for (const unit of units) {
            const pid = unit.project_id
            if (!byProject.has(pid)) {
              byProject.set(pid, {
                projectId: pid,
                projectName: unit.project.name,
                projectCode: unit.project.code,
                units: [],
              })
            }
            byProject.get(pid)!.units.push({
              id: unit.id,
              unitNumber: unit.unit_number,
              floor: unit.floor,
              building: unit.building,
              status: unit.status,
              areaSqm: unit.area_sqm,
              price: unit.price,
              type: unit.type,
            })
          }

          return { availability: Array.from(byProject.values()) }
        })
        .get('/', async ({ query }) => {
          const page = Math.max(1, Number(query.page ?? 1))
          const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
          const skip = (page - 1) * limit

          const where: Record<string, unknown> = {}
          if (query.projectId) where.project_id = query.projectId
          if (query.status) where.status = query.status
          if (query.type) where.type = query.type
          if (query.floor !== undefined) where.floor = Number(query.floor)
          if (query.search) {
            where.unit_number = { contains: query.search, mode: 'insensitive' }
          }
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
              orderBy: [{ project_id: 'asc' }, { floor: 'asc' }, { unit_number: 'asc' }],
              include: { project: { select: { id: true, name: true, code: true } } },
            }),
          ])

          return {
            data: units,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          }
        })
        .get('/:id', async ({ params, set }) => {
          const unit = await prisma.unit.findUnique({
            where: { id: params.id },
            include: { project: { select: { id: true, name: true, code: true } } },
          })
          if (!unit) {
            set.status = 404
            return { error: 'Unit not found' }
          }
          return { unit }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const project = await prisma.project.findUnique({ where: { id: body.projectId } })
            if (!project) {
              set.status = 404
              return { error: 'Project not found' }
            }

            const existing = await prisma.unit.findUnique({
              where: {
                project_id_unit_number: {
                  project_id: body.projectId,
                  unit_number: body.unitNumber,
                },
              },
            })
            if (existing) {
              set.status = 409
              return { error: 'Unit number already exists in this project' }
            }

            const unit = await prisma.unit.create({
              data: {
                project_id: body.projectId,
                unit_number: body.unitNumber,
                floor: body.floor,
                building: body.building,
                type: body.type,
                area_sqm: body.areaSqm,
                price: body.price,
                status: body.status ?? 'AVAILABLE',
                features: body.features ?? {},
              },
              include: { project: { select: { id: true, name: true, code: true } } },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'CREATE',
              entityType: 'Unit',
              entityId: unit.id,
              ipAddress: getIpAddress(headers),
            })
            set.status = 201
            return { unit }
          },
          { body: createUnitSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.unit.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Unit not found' }
            }

            if (body.unitNumber && body.unitNumber !== existing.unit_number) {
              const conflict = await prisma.unit.findUnique({
                where: {
                  project_id_unit_number: {
                    project_id: existing.project_id,
                    unit_number: body.unitNumber,
                  },
                },
              })
              if (conflict) {
                set.status = 409
                return { error: 'Unit number already exists in this project' }
              }
            }

            const unit = await prisma.unit.update({
              where: { id: params.id },
              data: {
                unit_number: body.unitNumber,
                floor: body.floor,
                building: body.building,
                type: body.type,
                area_sqm: body.areaSqm,
                price: body.price,
                status: body.status,
                features: body.features,
              },
              include: { project: { select: { id: true, name: true, code: true } } },
            })
            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Unit',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })
            return { unit }
          },
          { body: updateUnitSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.unit.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Unit not found' }
          }

          const unit = await prisma.unit.update({
            where: { id: params.id },
            data: { status: 'UNDER_MAINTENANCE' },
            include: { project: { select: { id: true, name: true, code: true } } },
          })
          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Unit',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })
          return { unit }
        })
  )

export type UnitsRoutes = typeof unitsRoutes
