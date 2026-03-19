import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { prisma } from '../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET ?? 'thanamol-jwt-secret-dev-only'

export type AuthenticatedUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  phone: string | null
  department: string | null
  position: string | null
  isActive: boolean
  roles: Array<{ id: string; name: string }>
}

export const jwtAccessPlugin = jwt({
  name: 'jwtAccess',
  secret: JWT_SECRET,
})

export const authPlugin = new Elysia({ name: 'auth-plugin' })
  .use(jwtAccessPlugin)
  .derive({ as: 'global' }, async ({ jwtAccess, headers }) => {
    const authorization = headers.authorization
    if (!authorization?.startsWith('Bearer ')) {
      return { authUser: null as AuthenticatedUser | null }
    }
    const token = authorization.slice(7)
    const payload = await jwtAccess.verify(token)
    if (!payload || typeof payload.sub !== 'string') {
      return { authUser: null as AuthenticatedUser | null }
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })
    if (!user || !user.is_active) {
      return { authUser: null as AuthenticatedUser | null }
    }
    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      department: user.department,
      position: user.position,
      isActive: user.is_active,
      roles: user.roles.map((ur: { role: { id: string; name: string } }) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
    }
    return { authUser }
  })

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(authPlugin)
  .guard({
    beforeHandle({ authUser, set }) {
      if (!authUser) {
        set.status = 401
        return { message: 'Unauthorized' }
      }
    },
  })
