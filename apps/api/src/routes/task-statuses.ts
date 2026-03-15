import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const createTaskStatusSchema = t.Object({
  name: t.String({ minLength: 1 }),
  color: t.String({ minLength: 1 }),
  order: t.Integer({ minimum: 0 }),
  isDefault: t.Optional(t.Boolean()),
  isClosed: t.Optional(t.Boolean()),
})

const updateTaskStatusSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  color: t.Optional(t.String({ minLength: 1 })),
  order: t.Optional(t.Integer({ minimum: 0 })),
  isDefault: t.Optional(t.Boolean()),
  isClosed: t.Optional(t.Boolean()),
})

export const taskStatusesRoutes = new Elysia({ prefix: '/api/task-statuses' })
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
        .get('/', async () => {
          const data = await prisma.taskStatus.findMany({
            orderBy: { order: 'asc' },
          })
          return { data }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const taskStatus = await prisma.taskStatus.create({
              data: {
                name: body.name,
                color: body.color,
                order: body.order,
                is_default: body.isDefault ?? false,
                is_closed: body.isClosed ?? false,
              },
            })
            set.status = 201
            return { taskStatus }
          },
          { body: createTaskStatusSchema },
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.taskStatus.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Task status not found' }
            }
            const taskStatus = await prisma.taskStatus.update({
              where: { id: params.id },
              data: {
                name: body.name,
                color: body.color,
                order: body.order,
                is_default: body.isDefault,
                is_closed: body.isClosed,
              },
            })
            return { taskStatus }
          },
          { body: updateTaskStatusSchema },
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.taskStatus.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Task status not found' }
          }
          await prisma.taskStatus.delete({ where: { id: params.id } })
          return { success: true }
        }),
  )
