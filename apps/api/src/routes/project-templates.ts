import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const createTemplateSchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  settings: t.Optional(t.Record(t.String(), t.Unknown())),
})

const updateTemplateSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  settings: t.Optional(t.Record(t.String(), t.Unknown())),
})

export const projectTemplatesRoutes = new Elysia({ prefix: '/api/project-templates' })
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
          const templates = await prisma.projectTemplate.findMany({
            orderBy: { created_at: 'desc' },
          })
          return { templates }
        })
        .get('/:id', async ({ params, set }) => {
          const template = await prisma.projectTemplate.findUnique({ where: { id: params.id } })
          if (!template) {
            set.status = 404
            return { error: 'Project template not found' }
          }
          return { template }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const template = await prisma.projectTemplate.create({
              data: {
                name: body.name,
                description: body.description,
                settings: body.settings ?? {},
              },
            })
            set.status = 201
            return { template }
          },
          { body: createTemplateSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.projectTemplate.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Project template not found' }
            }

            const template = await prisma.projectTemplate.update({
              where: { id: params.id },
              data: {
                name: body.name,
                description: body.description,
                settings: body.settings,
              },
            })
            return { template }
          },
          { body: updateTemplateSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.projectTemplate.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Project template not found' }
          }

          await prisma.projectTemplate.delete({ where: { id: params.id } })
          return { success: true }
        })
  )

export type ProjectTemplatesRoutes = typeof projectTemplatesRoutes
