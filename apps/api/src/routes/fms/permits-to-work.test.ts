import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    permitToWork: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsPermitsToWorkRoutes } from './permits-to-work'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsPermitsToWorkRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
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

const mockUser = {
  id: 'user-1',
  email: 'dev@example.com',
  first_name: 'Dev',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockPermit = {
  id: 'ptw-1',
  permit_number: 'PTW-202501-0001',
  title: 'Hot Work at Roof',
  description: null,
  project_id: 'proj-1',
  zone_id: null,
  permit_type: 'Hot Work',
  status: 'DRAFT',
  risk_assessment: [],
  safety_measures: [],
  start_date: null,
  end_date: null,
  requested_by: 'user-1',
  approved_by: null,
  contractor_name: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project' },
  zone: null,
  requester: null,
  approver: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
})

describe('GET /fms/permits-to-work', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/permits-to-work')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with valid token', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.permitToWork.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockPermit])

    const res = await req('GET', '/api/fms/permits-to-work', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })
})

describe('POST /fms/permits-to-work', () => {
  it('creates permit with auto-generated number', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(prisma.permitToWork.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockPermit)

    const res = await req(
      'POST',
      '/api/fms/permits-to-work',
      { title: 'Hot Work at Roof', projectId: 'proj-1' },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.permit.status).toBe('DRAFT')
  })

  it('returns 401 without token', async () => {
    const res = await req('POST', '/api/fms/permits-to-work', { title: 'Test', projectId: 'proj-1' })
    expect(res.status).toBe(401)
  })
})

describe('PATCH /fms/permits-to-work/:id/submit', () => {
  it('transitions DRAFT to SUBMITTED', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPermit)
    const submitted = { ...mockPermit, status: 'SUBMITTED' }
    ;(prisma.permitToWork.update as ReturnType<typeof vi.fn>).mockResolvedValue(submitted)

    const res = await req('PATCH', '/api/fms/permits-to-work/ptw-1/submit', {}, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.permit.status).toBe('SUBMITTED')
  })

  it('returns 422 when permit not in DRAFT status', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPermit,
      status: 'ACTIVE',
    })

    const res = await req('PATCH', '/api/fms/permits-to-work/ptw-1/submit', {}, token)
    expect(res.status).toBe(422)
  })
})

describe('PATCH /fms/permits-to-work/:id/reject', () => {
  it('transitions SUBMITTED to REJECTED', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPermit,
      status: 'SUBMITTED',
    })
    const rejected = { ...mockPermit, status: 'REJECTED' }
    ;(prisma.permitToWork.update as ReturnType<typeof vi.fn>).mockResolvedValue(rejected)

    const res = await req('PATCH', '/api/fms/permits-to-work/ptw-1/reject', {}, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.permit.status).toBe('REJECTED')
  })
})

describe('DELETE /fms/permits-to-work/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/permits-to-work/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes permit when found', async () => {
    const token = await signToken()
    ;(prisma.permitToWork.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPermit)
    ;(prisma.permitToWork.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockPermit)

    const res = await req('DELETE', '/api/fms/permits-to-work/ptw-1', undefined, token)
    expect(res.status).toBe(200)
  })
})
