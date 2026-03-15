import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    deal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { dealsRoutes } from './deals'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(dealsRoutes)

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

const mockDeal = {
  id: 'deal-1',
  title: 'Unit 101 Sale',
  customer_id: 'cust-1',
  lead_id: 'lead-1',
  stage: 'PROSPECTING',
  value: 2500000,
  probability: 30,
  expected_close_date: null,
  actual_close_date: null,
  notes: null,
  assigned_to: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/deals ───────────────────────────────────────────────────────────

describe('GET /api/deals', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/deals')
    expect(res.status).toBe(401)
  })

  it('returns paginated deal list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.count).mockResolvedValue(1)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([mockDeal] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deals', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by stage', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.count).mockResolvedValue(1)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([mockDeal] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deals?stage=PROSPECTING', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.deal.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ stage: 'PROSPECTING' }),
      })
    )
  })

  it('filters by assignedTo', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.count).mockResolvedValue(1)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([mockDeal] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deals?assignedTo=user-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.deal.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigned_to: 'user-1' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.count).mockResolvedValue(30)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/deals?page=3&limit=10', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(3)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(3)
  })
})

// ─── GET /api/deals/pipeline ──────────────────────────────────────────────────

describe('GET /api/deals/pipeline', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/deals/pipeline')
    expect(res.status).toBe(401)
  })

  it('returns pipeline grouped by all stages', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.groupBy).mockResolvedValue([
      { stage: 'PROSPECTING', _count: { _all: 2 }, _sum: { value: 5000000 } },
      { stage: 'QUALIFICATION', _count: { _all: 1 }, _sum: { value: 1200000 } },
    ] as never)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([
      mockDeal,
      { ...mockDeal, id: 'deal-2' },
    ] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deals/pipeline', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pipeline).toHaveLength(6)

    const prospecting = body.pipeline.find((p: { stage: string }) => p.stage === 'PROSPECTING')
    expect(prospecting).toBeDefined()
    expect(prospecting.count).toBe(2)
    expect(prospecting.totalValue).toBe(5000000)

    const qualification = body.pipeline.find((p: { stage: string }) => p.stage === 'QUALIFICATION')
    expect(qualification.count).toBe(1)

    const closedWon = body.pipeline.find((p: { stage: string }) => p.stage === 'CLOSED_WON')
    expect(closedWon.count).toBe(0)
    expect(closedWon.totalValue).toBe(0)
  })

  it('returns pipeline with empty stages when no deals', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.groupBy).mockResolvedValue([] as never)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/deals/pipeline', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pipeline).toHaveLength(6)
    body.pipeline.forEach((stage: { count: number; totalValue: number; deals: unknown[] }) => {
      expect(stage.count).toBe(0)
      expect(stage.totalValue).toBe(0)
      expect(stage.deals).toHaveLength(0)
    })
  })
})

// ─── GET /api/deals/:id ───────────────────────────────────────────────────────

describe('GET /api/deals/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/deals/deal-1')
    expect(res.status).toBe(401)
  })

  it('returns deal with relations', async () => {
    const dealWithRelations = {
      ...mockDeal,
      customer: { id: 'cust-1', name: 'Acme Corp', email: 'acme@example.com' },
      lead: { id: 'lead-1', title: 'Potential sale', status: 'QUALIFIED' },
      assignee: null,
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(dealWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/deals/deal-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.id).toBe('deal-1')
    expect(body.deal.customer).toBeDefined()
    expect(body.deal.lead).toBeDefined()
  })

  it('returns 404 when deal does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/deals/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deal not found')
  })
})

// ─── POST /api/deals ──────────────────────────────────────────────────────────

describe('POST /api/deals', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/deals', { title: 'Test Deal' })
    expect(res.status).toBe(401)
  })

  it('creates a deal successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.create).mockResolvedValue(mockDeal as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/deals',
      { title: 'Unit 101 Sale', customerId: 'cust-1', value: 2500000 },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.deal.title).toBe('Unit 101 Sale')
  })

  it('defaults stage to PROSPECTING', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.create).mockResolvedValue({ ...mockDeal, stage: 'PROSPECTING' } as never)

    const token = await signToken()
    const res = await request('POST', '/api/deals', { title: 'New Deal' }, token)

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.deal.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: 'PROSPECTING' }),
      })
    )
  })

  it('returns 422 when title is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/deals', { value: 100000 }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/deals/:id ───────────────────────────────────────────────────────

describe('PUT /api/deals/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/deals/deal-1', { title: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('updates a deal successfully', async () => {
    const updated = { ...mockDeal, title: 'Updated Deal' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)
    vi.mocked(prisma.deal.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/deal-1', { title: 'Updated Deal' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.title).toBe('Updated Deal')
  })

  it('returns 404 when deal does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/nonexistent', { title: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deal not found')
  })

  it('allows valid stage transition PROSPECTING -> QUALIFICATION', async () => {
    const updated = { ...mockDeal, stage: 'QUALIFICATION' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)
    vi.mocked(prisma.deal.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/deal-1', { stage: 'QUALIFICATION' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.stage).toBe('QUALIFICATION')
  })

  it('allows valid stage transition to CLOSED_LOST', async () => {
    const updated = { ...mockDeal, stage: 'CLOSED_LOST' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)
    vi.mocked(prisma.deal.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/deal-1', { stage: 'CLOSED_LOST' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deal.stage).toBe('CLOSED_LOST')
  })

  it('rejects invalid stage transition PROSPECTING -> CLOSED_WON', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/deal-1', { stage: 'CLOSED_WON' }, token)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('Invalid stage transition')
  })

  it('allows same stage (no transition)', async () => {
    const updated = { ...mockDeal, title: 'Same Stage' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)
    vi.mocked(prisma.deal.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deals/deal-1', { stage: 'PROSPECTING', title: 'Same Stage' }, token)

    expect(res.status).toBe(200)
  })
})

// ─── DELETE /api/deals/:id ────────────────────────────────────────────────────

describe('DELETE /api/deals/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/deals/deal-1')
    expect(res.status).toBe(401)
  })

  it('deletes a deal successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as never)
    vi.mocked(prisma.deal.delete).mockResolvedValue(mockDeal as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/deals/deal-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when deal does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deal.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/deals/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deal not found')
  })
})
