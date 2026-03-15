import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET ?? 'thanamol-jwt-secret-dev-only'
const ACCESS_TOKEN_EXP = '15m'
const REFRESH_TOKEN_EXP_SECONDS = 7 * 24 * 60 * 60

const jwtAccessPlugin = jwt({
  name: 'jwtAccess',
  secret: JWT_SECRET,
  exp: ACCESS_TOKEN_EXP,
})

const jwtRefreshPlugin = jwt({
  name: 'jwtRefresh',
  secret: JWT_SECRET + '-refresh',
})

type UserWithRoles = {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  is_active: boolean
  roles: Array<{ role: { id: string; name: string } }>
}

function buildAuthUser(user: UserWithRoles): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    avatarUrl: user.avatar_url,
    isActive: user.is_active,
    roles: user.roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
  }
}

type JwtContext = {
  sign: (payload: { sub: string }) => Promise<string>
  verify: (token?: string) => Promise<false | { sub?: unknown; [key: string]: unknown }>
}

async function createRefreshTokenInDb(rawToken: string, userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXP_SECONDS * 1000)
  await prisma.refreshToken.create({
    data: {
      token: rawToken,
      user_id: userId,
      expires_at: expiresAt,
    },
  })
}

async function issueTokenPair(
  userId: string,
  jwtAccess: JwtContext,
  jwtRefresh: JwtContext
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await jwtAccess.sign({ sub: userId })
  const refreshToken = await jwtRefresh.sign({ sub: userId })
  await createRefreshTokenInDb(refreshToken, userId)
  return { accessToken, refreshToken }
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(jwtAccessPlugin)
  .use(jwtRefreshPlugin)
  .post(
    '/register',
    async ({ jwtAccess, jwtRefresh, body, set }) => {
      const { email, password, firstName, lastName } = body

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        set.status = 409
        return { message: 'Email already registered' }
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const user = await prisma.user.create({
        data: {
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
        },
        include: {
          roles: { include: { role: true } },
        },
      })

      const { accessToken, refreshToken } = await issueTokenPair(
        user.id,
        jwtAccess as unknown as JwtContext,
        jwtRefresh as unknown as JwtContext
      )

      return {
        user: buildAuthUser(user),
        accessToken,
        refreshToken,
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
      }),
    }
  )
  .post(
    '/login',
    async ({ jwtAccess, jwtRefresh, body, set }) => {
      const { email, password } = body

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          roles: { include: { role: true } },
        },
      })

      if (!user || !user.is_active) {
        set.status = 401
        return { message: 'Invalid credentials' }
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      if (!passwordMatch) {
        set.status = 401
        return { message: 'Invalid credentials' }
      }

      const { accessToken, refreshToken } = await issueTokenPair(
        user.id,
        jwtAccess as unknown as JwtContext,
        jwtRefresh as unknown as JwtContext
      )

      return {
        user: buildAuthUser(user),
        accessToken,
        refreshToken,
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post(
    '/refresh',
    async ({ jwtAccess, jwtRefresh, body, set }) => {
      const { refreshToken } = body

      const payload = await (jwtRefresh as unknown as JwtContext).verify(refreshToken)
      if (!payload || typeof payload.sub !== 'string') {
        set.status = 401
        return { message: 'Invalid refresh token' }
      }

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })

      if (!stored) {
        set.status = 401
        return { message: 'Refresh token not found' }
      }

      if (stored.expires_at < new Date()) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
        set.status = 401
        return { message: 'Refresh token expired' }
      }

      await prisma.refreshToken.delete({ where: { id: stored.id } })

      const newAccessToken = await (jwtAccess as unknown as JwtContext).sign({ sub: payload.sub })
      const newRefreshToken = await (jwtRefresh as unknown as JwtContext).sign({
        sub: payload.sub,
      })
      await createRefreshTokenInDb(newRefreshToken, payload.sub)

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
    }
  )
  .use(authPlugin)
  .guard(
    {
      beforeHandle({ authUser, set }) {
        if (!authUser) {
          set.status = 401
          return { message: 'Unauthorized' }
        }
      },
    },
    (app) =>
      app
        .get('/me', ({ authUser }) => {
          return { user: authUser as AuthenticatedUser }
        })
        .post(
          '/logout',
          async ({ authUser, body }) => {
            const { refreshToken } = body

            if (refreshToken) {
              await prisma.refreshToken
                .delete({ where: { token: refreshToken } })
                .catch(() => null)
            } else {
              await prisma.refreshToken
                .deleteMany({ where: { user_id: (authUser as AuthenticatedUser).id } })
                .catch(() => null)
            }

            return { success: true }
          },
          {
            body: t.Object({
              refreshToken: t.Optional(t.String()),
            }),
          }
        )
  )
