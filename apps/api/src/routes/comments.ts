import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'

const createCommentSchema = t.Object({
  entityType: t.String({ minLength: 1 }),
  entityId: t.String({ minLength: 1 }),
  content: t.String({ minLength: 1 }),
})

const updateCommentSchema = t.Object({
  content: t.String({ minLength: 1 }),
})

export const commentsRoutes = new Elysia({ prefix: '/api/comments' })
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
          async ({ query, set }) => {
            if (!query.entityType || !query.entityId) {
              set.status = 400
              return { error: 'entityType and entityId are required' }
            }

            const comments = await prisma.comment.findMany({
              where: {
                entity_type: query.entityType,
                entity_id: query.entityId,
              },
              orderBy: { created_at: 'asc' },
              include: {
                user: {
                  select: { id: true, first_name: true, last_name: true, email: true },
                },
              },
            })

            return { data: comments }
          },
          {
            query: t.Object({
              entityType: t.Optional(t.String()),
              entityId: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/',
          async ({ body, authUser, set }) => {
            const user = authUser as AuthenticatedUser
            const comment = await prisma.comment.create({
              data: {
                entity_type: body.entityType,
                entity_id: body.entityId,
                user_id: user.id,
                content: body.content,
              },
              include: {
                user: {
                  select: { id: true, first_name: true, last_name: true, email: true },
                },
              },
            })
            set.status = 201
            return { comment }
          },
          { body: createCommentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, set }) => {
            const user = authUser as AuthenticatedUser
            const existing = await prisma.comment.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Comment not found' }
            }
            if (existing.user_id !== user.id) {
              set.status = 403
              return { error: 'Forbidden' }
            }
            const comment = await prisma.comment.update({
              where: { id: params.id },
              data: { content: body.content },
              include: {
                user: {
                  select: { id: true, first_name: true, last_name: true, email: true },
                },
              },
            })
            return { comment }
          },
          { body: updateCommentSchema }
        )
        .delete('/:id', async ({ params, authUser, set }) => {
          const user = authUser as AuthenticatedUser
          const existing = await prisma.comment.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Comment not found' }
          }
          if (existing.user_id !== user.id) {
            set.status = 403
            return { error: 'Forbidden' }
          }
          await prisma.comment.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
