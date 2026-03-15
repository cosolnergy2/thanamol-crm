import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const createHandoverPhotosSchema = t.Object({
  handoverId: t.String({ minLength: 1 }),
  photos: t.Optional(t.Array(t.Any())),
  description: t.Optional(t.String()),
  category: t.Optional(t.String()),
})

const updateHandoverPhotosSchema = t.Object({
  photos: t.Optional(t.Array(t.Any())),
  description: t.Optional(t.String()),
  category: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const handoverPhotosRoutes = new Elysia({ prefix: '/api/handover-photos' })
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

            if (query.handoverId) {
              where.handover_id = query.handoverId
            }

            const [total, photos] = await Promise.all([
              prisma.handoverPhotos.count({ where }),
              prisma.handoverPhotos.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: photos,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              handoverId: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const photo = await prisma.handoverPhotos.findUnique({
            where: { id: params.id },
          })
          if (!photo) {
            set.status = 404
            return { error: 'Handover photo not found' }
          }
          return { photo }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const photo = await prisma.handoverPhotos.create({
              data: {
                handover_id: body.handoverId,
                photos: (body.photos as object[]) ?? [],
                description: body.description ?? null,
                category: body.category ?? null,
              },
            })
            set.status = 201
            return { photo }
          },
          { body: createHandoverPhotosSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.handoverPhotos.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Handover photo not found' }
            }

            const photo = await prisma.handoverPhotos.update({
              where: { id: params.id },
              data: {
                photos: body.photos !== undefined ? (body.photos as object[]) : undefined,
                description: body.description,
                category: body.category,
              },
            })
            return { photo }
          },
          { body: updateHandoverPhotosSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.handoverPhotos.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Handover photo not found' }
          }
          await prisma.handoverPhotos.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
