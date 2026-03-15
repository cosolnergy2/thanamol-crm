import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import bcrypt from 'bcryptjs'

// Mock prisma before any route imports
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { authRoutes } from './auth'

// The default JWT_SECRET used when env is not set
const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtAccessSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const jwtRefreshSigner = new Elysia()
  .use(jwt({ name: 'jwtRefresh', secret: DEFAULT_JWT_SECRET + '-refresh' }))
  .get('/sign', ({ jwtRefresh }) => jwtRefresh.sign({ sub: 'user-1' }))

const testApp = new Elysia().use(authRoutes)

async function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return testApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

async function signAccessToken(): Promise<string> {
  const res = await jwtAccessSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function signRefreshToken(): Promise<string> {
  const res = await jwtRefreshSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password_hash: bcrypt.hashSync('password123', 12),
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never)

    const res = await makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('test@example.com')
    expect(body.user.firstName).toBe('Test')
    expect(body.user.lastName).toBe('User')
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce()
  })

  it('returns 409 when email already registered', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const res = await makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.message).toBe('Email already registered')
  })

  it('returns 422 when required fields are missing', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
    })
    expect(res.status).toBe(422)
  })
})

describe('POST /api/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never)

    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.id).toBe('user-1')
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
  })

  it('returns 401 for invalid password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword',
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Invalid credentials')
  })

  it('returns 401 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'notfound@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Invalid credentials')
  })

  it('returns 401 for inactive user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      is_active: false,
    } as never)

    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/refresh', () => {
  it('issues new tokens when refresh token is valid', async () => {
    const rawToken = await signRefreshToken()

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 'rt-1',
      token: rawToken,
      user_id: 'user-1',
      expires_at: futureDate,
      created_at: new Date(),
    } as never)
    vi.mocked(prisma.refreshToken.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never)

    const res = await makeRequest('POST', '/api/auth/refresh', { refreshToken: rawToken })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
    // Old token deleted, new one stored — refresh token rotation
    expect(prisma.refreshToken.delete).toHaveBeenCalledOnce()
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce()
  })

  it('returns 401 when refresh token not in database', async () => {
    const rawToken = await signRefreshToken()
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null)

    const res = await makeRequest('POST', '/api/auth/refresh', { refreshToken: rawToken })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Refresh token not found')
  })

  it('returns 401 for expired refresh token in DB', async () => {
    const rawToken = await signRefreshToken()
    const pastDate = new Date(Date.now() - 1000)

    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: 'rt-1',
      token: rawToken,
      user_id: 'user-1',
      expires_at: pastDate,
      created_at: new Date(),
    } as never)
    vi.mocked(prisma.refreshToken.delete).mockResolvedValue({} as never)

    const res = await makeRequest('POST', '/api/auth/refresh', { refreshToken: rawToken })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Refresh token expired')
  })

  it('returns 401 for invalid/tampered refresh token', async () => {
    const res = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: 'tampered.invalid.token',
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.message).toBe('Invalid refresh token')
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 when no token provided', async () => {
    const res = await makeRequest('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid token', async () => {
    const res = await makeRequest('GET', '/api/auth/me', undefined, 'invalid.token.here')
    expect(res.status).toBe(401)
  })

  it('returns current user for valid token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signAccessToken()
    const res = await makeRequest('GET', '/api/auth/me', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.id).toBe('user-1')
    expect(body.user.email).toBe('test@example.com')
    expect(body.user.firstName).toBe('Test')
  })
})

describe('POST /api/auth/logout', () => {
  it('returns 401 when no token provided', async () => {
    const res = await makeRequest('POST', '/api/auth/logout', {})
    expect(res.status).toBe(401)
  })

  it('deletes specific refresh token when provided in body', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.refreshToken.delete).mockResolvedValue({} as never)

    const token = await signAccessToken()
    const res = await makeRequest(
      'POST',
      '/api/auth/logout',
      { refreshToken: 'some-token' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { token: 'some-token' },
    })
  })

  it('deletes all user refresh tokens when no specific token provided', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 1 } as never)

    const token = await signAccessToken()
    const res = await makeRequest('POST', '/api/auth/logout', {}, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
    })
  })
})
