import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { getUserAggregatedPermissions } from '../middleware/permissions'

const roleBodySchema = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  permissions: t.Optional(t.Record(t.String(), t.Boolean())),
})

export const rolesRoutes = new Elysia({ prefix: '/api/roles' })
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
          const roles = await prisma.role.findMany({
            orderBy: { created_at: 'asc' },
          })
          return { roles }
        })
        .get('/:id', async ({ params, set }) => {
          const role = await prisma.role.findUnique({ where: { id: params.id } })
          if (!role) {
            set.status = 404
            return { error: 'Role not found' }
          }
          return { role }
        })
        .guard(
          {
            async beforeHandle({ authUser, set }) {
              const perms = await getUserAggregatedPermissions(
                (authUser as AuthenticatedUser).id
              )
              if (!perms['manage_roles']) {
                set.status = 403
                return { error: 'Forbidden' }
              }
            },
          },
          (inner) =>
            inner
              .post(
                '/',
                async ({ body, set }) => {
                  const { name, description, permissions } = body
                  const existing = await prisma.role.findUnique({ where: { name } })
                  if (existing) {
                    set.status = 409
                    return { error: 'Role name already exists' }
                  }
                  const role = await prisma.role.create({
                    data: {
                      name,
                      description: description ?? undefined,
                      permissions: permissions ?? {},
                    },
                  })
                  set.status = 201
                  return { role }
                },
                { body: roleBodySchema }
              )
              .put(
                '/:id',
                async ({ params, body, set }) => {
                  const existing = await prisma.role.findUnique({ where: { id: params.id } })
                  if (!existing) {
                    set.status = 404
                    return { error: 'Role not found' }
                  }
                  const role = await prisma.role.update({
                    where: { id: params.id },
                    data: {
                      name: body.name,
                      description: body.description,
                      permissions:
                        body.permissions ?? (existing.permissions as Record<string, boolean>),
                    },
                  })
                  return { role }
                },
                { body: roleBodySchema }
              )
              .delete('/:id', async ({ params, set }) => {
                const existing = await prisma.role.findUnique({ where: { id: params.id } })
                if (!existing) {
                  set.status = 404
                  return { error: 'Role not found' }
                }
                const assignedCount = await prisma.userRole.count({
                  where: { role_id: params.id },
                })
                if (assignedCount > 0) {
                  set.status = 409
                  return { error: 'Cannot delete role with assigned users' }
                }
                await prisma.role.delete({ where: { id: params.id } })
                return { success: true }
              })
        )
  )

export const userRoleRoutes = new Elysia({ prefix: '/api/users' })
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
        .get('/:userId/permissions', async ({ params, set }) => {
          const user = await prisma.user.findUnique({ where: { id: params.userId } })
          if (!user) {
            set.status = 404
            return { error: 'User not found' }
          }
          const permissions = await getUserAggregatedPermissions(params.userId)
          return { permissions }
        })
        .guard(
          {
            async beforeHandle({ authUser, set }) {
              const perms = await getUserAggregatedPermissions(
                (authUser as AuthenticatedUser).id
              )
              if (!perms['manage_roles']) {
                set.status = 403
                return { error: 'Forbidden' }
              }
            },
          },
          (inner) =>
            inner
              .post(
                '/:userId/roles',
                async ({ params, body, set }) => {
                  const { roleId } = body
                  const user = await prisma.user.findUnique({ where: { id: params.userId } })
                  if (!user) {
                    set.status = 404
                    return { error: 'User not found' }
                  }
                  const role = await prisma.role.findUnique({ where: { id: roleId } })
                  if (!role) {
                    set.status = 404
                    return { error: 'Role not found' }
                  }
                  const existing = await prisma.userRole.findUnique({
                    where: { user_id_role_id: { user_id: params.userId, role_id: roleId } },
                  })
                  if (existing) {
                    set.status = 409
                    return { error: 'Role already assigned to user' }
                  }
                  await prisma.userRole.create({
                    data: { user_id: params.userId, role_id: roleId },
                  })
                  set.status = 201
                  return { success: true }
                },
                {
                  body: t.Object({
                    roleId: t.String({ minLength: 1 }),
                  }),
                }
              )
              .delete('/:userId/roles/:roleId', async ({ params, set }) => {
                const userRole = await prisma.userRole.findUnique({
                  where: {
                    user_id_role_id: { user_id: params.userId, role_id: params.roleId },
                  },
                })
                if (!userRole) {
                  set.status = 404
                  return { error: 'User does not have this role' }
                }
                await prisma.userRole.delete({
                  where: {
                    user_id_role_id: { user_id: params.userId, role_id: params.roleId },
                  },
                })
                return { success: true }
              })
        )
  )
