import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    contract: {
      findUnique: vi.fn(),
    },
    preHandoverInspection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { preHandoverInspectionsRoutes } from './pre-handover-inspections'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(preHandoverInspectionsRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
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

const mockContract = {
  id: 'contract-1',
  contract_number: 'CTR-001',
  type: 'LEASE',
  status: 'ACTIVE',
}

const mockInspection = {
  id: 'insp-1',
  contract_id: 'contract-1',
  inspection_date: new Date('2026-03-15'),
  inspector: 'John Doe',
  items: [],
  overall_status: 'CONDITIONAL',
  notes: null,
  photos: [],
  created_at: new Date(),
  updated_at: new Date(),
  contract: mockContract,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/pre-handover-inspections', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/pre-handover-inspections')
    expect(res.status).toBe(401)
  })

  it('returns list of inspections', async () => {
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(1)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([mockInspection] as never)
    const token = await signToken()

    const res = await request('GET', '/api/pre-handover-inspections', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(0)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([])
    const token = await signToken()

    const res = await request('GET', '/api/pre-handover-inspections?status=PASS', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.preHandoverInspection.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ overall_status: 'PASS' }),
      }),
    )
  })
})

describe('GET /api/pre-handover-inspections/:id', () => {
  it('returns 404 for unknown id', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)
    const token = await signToken()

    const res = await request('GET', '/api/pre-handover-inspections/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns inspection by id', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(mockInspection as never)
    const token = await signToken()

    const res = await request('GET', '/api/pre-handover-inspections/insp-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inspection.id).toBe('insp-1')
  })
})

describe('POST /api/pre-handover-inspections', () => {
  it('returns 401 without token', async () => {
    const res = await request('POST', '/api/pre-handover-inspections', {
      contractId: 'contract-1',
      inspectionDate: '2026-03-15',
      inspector: 'John Doe',
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contract not found', async () => {
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)
    const token = await signToken()

    const res = await request(
      'POST',
      '/api/pre-handover-inspections',
      { contractId: 'bad-id', inspectionDate: '2026-03-15', inspector: 'John' },
      token,
    )
    expect(res.status).toBe(404)
  })

  it('creates inspection with 201 status', async () => {
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.preHandoverInspection.create).mockResolvedValue(mockInspection as never)
    const token = await signToken()

    const res = await request(
      'POST',
      '/api/pre-handover-inspections',
      {
        contractId: 'contract-1',
        inspectionDate: '2026-03-15',
        inspector: 'John Doe',
      },
      token,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.inspection).toBeDefined()
  })
})

describe('PUT /api/pre-handover-inspections/:id', () => {
  it('returns 404 for unknown id', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)
    const token = await signToken()

    const res = await request(
      'PUT',
      '/api/pre-handover-inspections/nonexistent',
      { overallStatus: 'PASS' },
      token,
    )
    expect(res.status).toBe(404)
  })

  it('updates inspection successfully', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(mockInspection as never)
    const updated = { ...mockInspection, overall_status: 'PASS' }
    vi.mocked(prisma.preHandoverInspection.update).mockResolvedValue(updated as never)
    const token = await signToken()

    const res = await request(
      'PUT',
      '/api/pre-handover-inspections/insp-1',
      { overallStatus: 'PASS' },
      token,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inspection.overall_status).toBe('PASS')
  })
})

describe('DELETE /api/pre-handover-inspections/:id', () => {
  it('returns 404 for unknown id', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)
    const token = await signToken()

    const res = await request('DELETE', '/api/pre-handover-inspections/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes inspection successfully', async () => {
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(mockInspection as never)
    vi.mocked(prisma.preHandoverInspection.delete).mockResolvedValue(mockInspection as never)
    const token = await signToken()

    const res = await request('DELETE', '/api/pre-handover-inspections/insp-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
