import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
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

const mockInspection = {
  id: 'inspection-1',
  contract_id: 'contract-1',
  inspection_date: new Date('2026-03-10'),
  inspector: 'John Inspector',
  items: [],
  overall_status: 'CONDITIONAL',
  notes: null,
  photos: [],
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/pre-handover-inspections ────────────────────────────────────────

describe('GET /api/pre-handover-inspections', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/pre-handover-inspections')
    expect(res.status).toBe(401)
  })

  it('returns paginated inspection list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(1)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([mockInspection] as never)

    const token = await signToken()
    const res = await request('GET', '/api/pre-handover-inspections', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by contractId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(1)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([mockInspection] as never)

    const token = await signToken()
    const res = await request(
      'GET',
      '/api/pre-handover-inspections?contractId=contract-1',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.preHandoverInspection.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contract_id: 'contract-1' }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(1)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([mockInspection] as never)

    const token = await signToken()
    const res = await request(
      'GET',
      '/api/pre-handover-inspections?status=CONDITIONAL',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.preHandoverInspection.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ overall_status: 'CONDITIONAL' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.count).mockResolvedValue(30)
    vi.mocked(prisma.preHandoverInspection.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request(
      'GET',
      '/api/pre-handover-inspections?page=2&limit=10',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(3)
  })
})

// ─── GET /api/pre-handover-inspections/:id ────────────────────────────────────

describe('GET /api/pre-handover-inspections/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/pre-handover-inspections/inspection-1')
    expect(res.status).toBe(401)
  })

  it('returns inspection with contract relation', async () => {
    const inspectionWithRelations = {
      ...mockInspection,
      contract: { id: 'contract-1', contract_number: 'CTR-001', type: 'SALE', status: 'ACTIVE' },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(
      inspectionWithRelations as never
    )

    const token = await signToken()
    const res = await request(
      'GET',
      '/api/pre-handover-inspections/inspection-1',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inspection.id).toBe('inspection-1')
    expect(body.inspection.contract).toBeDefined()
  })

  it('returns 404 when inspection does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/pre-handover-inspections/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Pre-handover inspection not found')
  })
})

// ─── POST /api/pre-handover-inspections ──────────────────────────────────────

describe('POST /api/pre-handover-inspections', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/pre-handover-inspections', {
      contractId: 'contract-1',
      inspectionDate: '2026-03-10',
      inspector: 'John Inspector',
    })
    expect(res.status).toBe(401)
  })

  it('creates an inspection successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.create).mockResolvedValue(mockInspection as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/pre-handover-inspections',
      {
        contractId: 'contract-1',
        inspectionDate: '2026-03-10',
        inspector: 'John Inspector',
      },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.inspection.id).toBe('inspection-1')
  })

  it('defaults overall_status to CONDITIONAL', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.create).mockResolvedValue(mockInspection as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/pre-handover-inspections',
      { contractId: 'contract-1', inspectionDate: '2026-03-10', inspector: 'John' },
      token
    )

    expect(vi.mocked(prisma.preHandoverInspection.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ overall_status: 'CONDITIONAL' }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/pre-handover-inspections',
      { contractId: 'contract-1' },
      token
    )

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/pre-handover-inspections/:id ────────────────────────────────────

describe('PUT /api/pre-handover-inspections/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/pre-handover-inspections/inspection-1', {
      notes: 'Updated',
    })
    expect(res.status).toBe(401)
  })

  it('updates an inspection successfully', async () => {
    const updated = { ...mockInspection, notes: 'All good', overall_status: 'PASS' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(mockInspection as never)
    vi.mocked(prisma.preHandoverInspection.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/pre-handover-inspections/inspection-1',
      { notes: 'All good', overallStatus: 'PASS' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.inspection.overall_status).toBe('PASS')
  })

  it('returns 404 when inspection does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/pre-handover-inspections/nonexistent',
      { notes: 'X' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Pre-handover inspection not found')
  })
})

// ─── DELETE /api/pre-handover-inspections/:id ─────────────────────────────────

describe('DELETE /api/pre-handover-inspections/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/pre-handover-inspections/inspection-1')
    expect(res.status).toBe(401)
  })

  it('deletes an inspection successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(mockInspection as never)
    vi.mocked(prisma.preHandoverInspection.delete).mockResolvedValue(mockInspection as never)

    const token = await signToken()
    const res = await request(
      'DELETE',
      '/api/pre-handover-inspections/inspection-1',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when inspection does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.preHandoverInspection.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'DELETE',
      '/api/pre-handover-inspections/nonexistent',
      undefined,
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Pre-handover inspection not found')
  })
})
