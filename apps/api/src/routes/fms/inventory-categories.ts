import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const createCategorySchema = t.Object({
  name: t.String({ minLength: 1 }),
  code: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  parentId: t.Optional(t.String()),
})

const updateCategorySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  code: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  parentId: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const fmsInventoryCategoriesRoutes = new Elysia({
  prefix: '/api/fms/inventory-categories',
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
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.search) {
              where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ]
            }
            if (query.parentId !== undefined) {
              where.parent_id = query.parentId === '' ? null : query.parentId
            }

            const [total, categories] = await Promise.all([
              prisma.inventoryCategory.count({ where }),
              prisma.inventoryCategory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                  children: { orderBy: { name: 'asc' } },
                  parent: true,
                  _count: { select: { items: true } },
                },
              }),
            ])

            return { data: categories, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              search: t.Optional(t.String()),
              parentId: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const category = await prisma.inventoryCategory.findUnique({
            where: { id: params.id },
            include: {
              children: { orderBy: { name: 'asc' }, include: { _count: { select: { items: true } } } },
              parent: true,
              _count: { select: { items: true } },
            },
          })
          if (!category) {
            set.status = 404
            return { error: 'Inventory category not found' }
          }
          return { category }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const existing = await prisma.inventoryCategory.findUnique({
              where: { code: body.code },
            })
            if (existing) {
              set.status = 409
              return { error: 'A category with this code already exists' }
            }

            const category = await prisma.inventoryCategory.create({
              data: {
                name: body.name,
                code: body.code,
                description: body.description ?? null,
                parent_id: body.parentId ?? null,
              },
              include: {
                children: true,
                parent: true,
                _count: { select: { items: true } },
              },
            })
            set.status = 201
            return { category }
          },
          { body: createCategorySchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.inventoryCategory.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Inventory category not found' }
            }

            if (body.code && body.code !== existing.code) {
              const codeConflict = await prisma.inventoryCategory.findUnique({
                where: { code: body.code },
              })
              if (codeConflict) {
                set.status = 409
                return { error: 'A category with this code already exists' }
              }
            }

            const category = await prisma.inventoryCategory.update({
              where: { id: params.id },
              data: {
                name: body.name,
                code: body.code,
                description: body.description,
                parent_id: body.parentId,
              },
              include: {
                children: true,
                parent: true,
                _count: { select: { items: true } },
              },
            })
            return { category }
          },
          { body: updateCategorySchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const category = await prisma.inventoryCategory.findUnique({
            where: { id: params.id },
            include: { _count: { select: { children: true, items: true } } },
          })
          if (!category) {
            set.status = 404
            return { error: 'Inventory category not found' }
          }
          if (category._count.children > 0) {
            set.status = 409
            return { error: 'Cannot delete category with sub-categories. Remove sub-categories first.' }
          }
          if (category._count.items > 0) {
            set.status = 409
            return { error: 'Cannot delete category with items. Reassign items first.' }
          }

          await prisma.inventoryCategory.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
