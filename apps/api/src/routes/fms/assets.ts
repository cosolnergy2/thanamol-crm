import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const ASSET_STATUSES = ['OPERATIONAL', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DISPOSED', 'IN_STORAGE'] as const

async function generateAssetNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `AST-${yearMonth}-`

  const count = await prisma.asset.count({
    where: { asset_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const assetInclude = {
  category: true,
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true, code: true } },
  unit: { select: { id: true, unit_number: true } },
  assignee: { select: { id: true, first_name: true, last_name: true } },
  _count: { select: { work_orders: true, calibrations: true, pm_schedules: true } },
}

const createAssetSchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
  manufacturer: t.Optional(t.String()),
  modelName: t.Optional(t.String()),
  serialNumber: t.Optional(t.String()),
  purchaseDate: t.Optional(t.String()),
  purchaseCost: t.Optional(t.Number()),
  warrantyExpiry: t.Optional(t.String()),
  status: t.Optional(t.String()),
  specifications: t.Optional(t.Record(t.String(), t.Unknown())),
  photos: t.Optional(t.Array(t.String())),
  assignedTo: t.Optional(t.String()),
  scopeType: t.Optional(t.String()),
  brand: t.Optional(t.String()),
  supplierId: t.Optional(t.String()),
  installDate: t.Optional(t.String()),
  criticality: t.Optional(t.String()),
  conditionScore: t.Optional(t.Number()),
  lifecycleStatus: t.Optional(t.String()),
})

const updateAssetSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  categoryId: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  unitId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
  manufacturer: t.Optional(t.String()),
  modelName: t.Optional(t.String()),
  serialNumber: t.Optional(t.String()),
  purchaseDate: t.Optional(t.String()),
  purchaseCost: t.Optional(t.Number()),
  warrantyExpiry: t.Optional(t.String()),
  status: t.Optional(t.String()),
  specifications: t.Optional(t.Record(t.String(), t.Unknown())),
  photos: t.Optional(t.Array(t.String())),
  assignedTo: t.Optional(t.String()),
  scopeType: t.Optional(t.String()),
  brand: t.Optional(t.String()),
  supplierId: t.Optional(t.String()),
  installDate: t.Optional(t.String()),
  criticality: t.Optional(t.String()),
  conditionScore: t.Optional(t.Number()),
  lifecycleStatus: t.Optional(t.String()),
})

export const fmsAssetsRoutes = new Elysia({ prefix: '/api/fms/assets' })
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
            if (query.zoneId) where.zone_id = query.zoneId
            if (query.categoryId) where.category_id = query.categoryId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { asset_number: { contains: query.search, mode: 'insensitive' } },
                { serial_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, assets] = await Promise.all([
              prisma.asset.count({ where }),
              prisma.asset.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: assetInclude,
              }),
            ])

            return { data: assets, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              categoryId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const asset = await prisma.asset.findUnique({
            where: { id: params.id },
            include: {
              ...assetInclude,
              work_orders: {
                orderBy: { created_at: 'desc' },
                take: 10,
                include: {
                  assignee: { select: { id: true, first_name: true, last_name: true } },
                },
              },
              calibrations: {
                orderBy: { calibration_date: 'desc' },
                take: 10,
              },
              pm_schedules: {
                orderBy: { created_at: 'desc' },
                take: 10,
                include: {
                  assignee: { select: { id: true, first_name: true, last_name: true } },
                },
              },
            },
          })
          if (!asset) {
            set.status = 404
            return { error: 'Asset not found' }
          }
          return { asset }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const assetNumber = await generateAssetNumber()

            const asset = await prisma.asset.create({
              data: {
                asset_number: assetNumber,
                name: body.name,
                description: body.description,
                category_id: body.categoryId ?? null,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                unit_id: body.unitId ?? null,
                location_detail: body.locationDetail ?? null,
                manufacturer: body.manufacturer ?? null,
                model_name: body.modelName ?? null,
                serial_number: body.serialNumber ?? null,
                purchase_date: body.purchaseDate ? new Date(body.purchaseDate) : null,
                purchase_cost: body.purchaseCost ?? null,
                warranty_expiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
                status: (body.status as typeof ASSET_STATUSES[number]) ?? 'OPERATIONAL',
                specifications: (body.specifications as object) ?? {},
                photos: body.photos ?? [],
                assigned_to: body.assignedTo ?? null,
                scope_type: body.scopeType ?? null,
                brand: body.brand ?? null,
                supplier_id: body.supplierId ?? null,
                install_date: body.installDate ? new Date(body.installDate) : null,
                criticality: body.criticality ?? null,
                condition_score: body.conditionScore ?? null,
                lifecycle_status: body.lifecycleStatus ?? null,
              },
              include: assetInclude,
            })
            set.status = 201
            return { asset }
          },
          { body: createAssetSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.asset.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Asset not found' }
            }

            const asset = await prisma.asset.update({
              where: { id: params.id },
              data: {
                name: body.name,
                description: body.description,
                category_id: body.categoryId,
                zone_id: body.zoneId,
                unit_id: body.unitId,
                location_detail: body.locationDetail,
                manufacturer: body.manufacturer,
                model_name: body.modelName,
                serial_number: body.serialNumber,
                purchase_date: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
                purchase_cost: body.purchaseCost,
                warranty_expiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
                status: body.status as typeof ASSET_STATUSES[number] | undefined,
                specifications: body.specifications as object | undefined,
                photos: body.photos,
                assigned_to: body.assignedTo,
                scope_type: body.scopeType,
                brand: body.brand,
                supplier_id: body.supplierId,
                install_date: body.installDate ? new Date(body.installDate) : undefined,
                criticality: body.criticality,
                condition_score: body.conditionScore,
                lifecycle_status: body.lifecycleStatus,
              },
              include: assetInclude,
            })
            return { asset }
          },
          { body: updateAssetSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const asset = await prisma.asset.findUnique({
            where: { id: params.id },
            include: { _count: { select: { work_orders: true } } },
          })
          if (!asset) {
            set.status = 404
            return { error: 'Asset not found' }
          }

          await prisma.asset.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
