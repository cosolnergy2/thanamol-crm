import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userAuditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { activityLogsRoutes } from './activity-logs'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(activityLogsRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

const mockAuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockActivityLog = {
  id: 'log-1',
  user_id: 'user-1',
  action: 'CREATE',
  entity_type: 'Customer',
  entity_id: 'cust-1',
  details: null,
  ip_address: null,
  created_at: new Date(),
  user: { id: 'user-1', first_name: 'Admin', last_name: 'User', email: 'admin@example.com' },
}

const mockAuditLog = {
  id: 'audit-1',
  user_id: 'user-1',
  action: 'LOGIN',
  details: null,
  ip_address: '127.0.0.1',
  created_at: new Date(),
  user: { id: 'user-1', first_name: 'Admin', last_name: 'User', email: 'admin@example.com' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/activity-logs', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/activity-logs')
    expect(res.status).toBe(401)
  })

  it('returns paginated activity logs', async () => {
    const token = await signToken()
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockActivityLog] as never)

    const res = await request('GET', '/api/activity-logs', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by userId', async () => {
    const token = await signToken()
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockActivityLog] as never)

    const res = await request('GET', '/api/activity-logs?userId=user-1', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.activityLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 'user-1' }),
      })
    )
  })

  it('filters by entityType', async () => {
    const token = await signToken()
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockActivityLog] as never)

    const res = await request('GET', '/api/activity-logs?entityType=Customer', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.activityLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entity_type: 'Customer' }),
      })
    )
  })

  it('filters by action', async () => {
    const token = await signToken()
    vi.mocked(prisma.activityLog.count).mockResolvedValue(1)
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([mockActivityLog] as never)

    const res = await request('GET', '/api/activity-logs?action=CREATE', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.activityLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'CREATE' }),
      })
    )
  })
})

describe('GET /api/audit-logs', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/audit-logs')
    expect(res.status).toBe(401)
  })

  it('returns paginated audit logs', async () => {
    const token = await signToken()
    vi.mocked(prisma.userAuditLog.count).mockResolvedValue(1)
    vi.mocked(prisma.userAuditLog.findMany).mockResolvedValue([mockAuditLog] as never)

    const res = await request('GET', '/api/audit-logs', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by userId and action', async () => {
    const token = await signToken()
    vi.mocked(prisma.userAuditLog.count).mockResolvedValue(1)
    vi.mocked(prisma.userAuditLog.findMany).mockResolvedValue([mockAuditLog] as never)

    const res = await request('GET', '/api/audit-logs?userId=user-1&action=LOGIN', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.userAuditLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 'user-1', action: 'LOGIN' }),
      })
    )
  })
})
