import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const createMeetingTemplateSchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  sections: t.Optional(t.Any()),
})

const updateMeetingTemplateSchema = t.Object({
  name: t.Optional(t.String()),
  description: t.Optional(t.String()),
  sections: t.Optional(t.Any()),
})

export const meetingTemplatesRoutes = new Elysia({ prefix: '/api/meeting-templates' })
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
          const templates = await prisma.meetingTemplate.findMany({
            orderBy: { created_at: 'desc' },
          })
          return { data: templates }
        })
        .get('/:id', async ({ params, set }) => {
          const template = await prisma.meetingTemplate.findUnique({
            where: { id: params.id },
          })
          if (!template) {
            set.status = 404
            return { error: 'Meeting template not found' }
          }
          return { template }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser

            const template = await prisma.meetingTemplate.create({
              data: {
                name: body.name,
                description: body.description ?? null,
                sections: body.sections ?? [],
              },
            })

            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'MeetingTemplate',
              entityId: template.id,
              ipAddress: getIpAddress(headers),
            })

            set.status = 201
            return { template }
          },
          { body: createMeetingTemplateSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.meetingTemplate.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Meeting template not found' }
            }

            const template = await prisma.meetingTemplate.update({
              where: { id: params.id },
              data: {
                name: body.name,
                description: body.description,
                sections: body.sections,
              },
            })

            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'MeetingTemplate',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })

            return { template }
          },
          { body: updateMeetingTemplateSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.meetingTemplate.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Meeting template not found' }
          }

          await prisma.meetingTemplate.delete({ where: { id: params.id } })

          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'MeetingTemplate',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })

          return { success: true }
        })
  )
