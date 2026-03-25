import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    contractorSafety: {
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
import { fmsContractorSafetyRoutes } from './contractor-safety'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsContractorSafetyRoutes)

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

const mockRecord = {
  id: 'cs-1',
  contractor_name: 'ABC Construction Co.',
  project_id: 'proj-1',
  safety_induction_date: new Date('2025-01-15').toISOString(),
  safety_cert_url: null,
  is_cleared: false,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project' },
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
})

describe('GET /fms/contractor-safety', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/contractor-safety')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with valid token', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.contractorSafety.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRecord])

    const res = await req('GET', '/api/fms/contractor-safety', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })
})

describe('POST /fms/contractor-safety', () => {
  it('creates safety record', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord)

    const res = await req(
      'POST',
      '/api/fms/contractor-safety',
      {
        contractorName: 'ABC Construction Co.',
        projectId: 'proj-1',
      },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.contractor.contractor_name).toBe('ABC Construction Co.')
    expect(data.contractor.is_cleared).toBe(false)
  })

  it('returns 401 without token', async () => {
    const res = await req('POST', '/api/fms/contractor-safety', {
      contractorName: 'Test',
      projectId: 'proj-1',
    })
    expect(res.status).toBe(401)
  })
})

describe('PATCH /fms/contractor-safety/:id/toggle-clearance', () => {
  it('toggles clearance from false to true', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord)
    const cleared = { ...mockRecord, is_cleared: true }
    ;(prisma.contractorSafety.update as ReturnType<typeof vi.fn>).mockResolvedValue(cleared)

    const res = await req('PATCH', '/api/fms/contractor-safety/cs-1/toggle-clearance', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contractor.is_cleared).toBe(true)
  })

  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('PATCH', '/api/fms/contractor-safety/nonexistent/toggle-clearance', undefined, token)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /fms/contractor-safety/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/contractor-safety/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes record when found', async () => {
    const token = await signToken()
    ;(prisma.contractorSafety.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord)
    ;(prisma.contractorSafety.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockRecord)

    const res = await req('DELETE', '/api/fms/contractor-safety/cs-1', undefined, token)
    expect(res.status).toBe(200)
  })
})
