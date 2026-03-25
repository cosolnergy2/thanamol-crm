import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    insurancePolicy: {
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
import { fmsInsurancePoliciesRoutes } from './insurance-policies'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsInsurancePoliciesRoutes)

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

const mockPolicy = {
  id: 'pol-1',
  policy_number: 'POL-001',
  provider: 'Thai Insurance Co.',
  type: 'Property',
  project_id: 'proj-1',
  premium: 50000,
  start_date: new Date('2025-01-01').toISOString(),
  end_date: new Date('2026-01-01').toISOString(),
  status: 'ACTIVE',
  document_url: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project' },
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
})

describe('GET /fms/insurance-policies', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/insurance-policies')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with valid token', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.insurancePolicy.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockPolicy])

    const res = await req('GET', '/api/fms/insurance-policies', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })
})

describe('POST /fms/insurance-policies', () => {
  it('creates policy', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.insurancePolicy.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockPolicy)

    const res = await req(
      'POST',
      '/api/fms/insurance-policies',
      {
        policyNumber: 'POL-001',
        provider: 'Thai Insurance Co.',
        type: 'Property',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        status: 'ACTIVE',
      },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.policy.policy_number).toBe('POL-001')
  })

  it('returns 409 when policy number already exists', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPolicy)

    const res = await req(
      'POST',
      '/api/fms/insurance-policies',
      {
        policyNumber: 'POL-001',
        provider: 'Thai Insurance Co.',
        type: 'Property',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        status: 'ACTIVE',
      },
      token
    )
    expect(res.status).toBe(409)
  })
})

describe('PUT /fms/insurance-policies/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('PUT', '/api/fms/insurance-policies/nonexistent', { status: 'EXPIRED' }, token)
    expect(res.status).toBe(404)
  })

  it('updates policy when found', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPolicy)
    const updated = { ...mockPolicy, status: 'EXPIRED' }
    ;(prisma.insurancePolicy.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

    const res = await req('PUT', '/api/fms/insurance-policies/pol-1', { status: 'EXPIRED' }, token)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /fms/insurance-policies/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/insurance-policies/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes policy when found', async () => {
    const token = await signToken()
    ;(prisma.insurancePolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPolicy)
    ;(prisma.insurancePolicy.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockPolicy)

    const res = await req('DELETE', '/api/fms/insurance-policies/pol-1', undefined, token)
    expect(res.status).toBe(200)
  })
})
