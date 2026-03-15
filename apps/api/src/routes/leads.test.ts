import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    lead: {
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
import { leadsRoutes } from './leads'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(leadsRoutes)

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

const mockLead = {
  id: 'lead-1',
  title: 'Potential sale to Acme',
  customer_id: 'cust-1',
  contact_id: null,
  source: 'WEBSITE',
  status: 'NEW',
  value: 50000,
  probability: 20,
  expected_close_date: null,
  notes: null,
  assigned_to: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/leads ───────────────────────────────────────────────────────────

describe('GET /api/leads', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/leads')
    expect(res.status).toBe(401)
  })

  it('returns paginated lead list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(1)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([mockLead] as never)

    const token = await signToken()
    const res = await request('GET', '/api/leads', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by search (title)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(0)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/leads?search=acme', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.lead.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: 'acme', mode: 'insensitive' },
        }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(1)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([mockLead] as never)

    const token = await signToken()
    const res = await request('GET', '/api/leads?status=NEW', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.lead.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'NEW' }),
      })
    )
  })

  it('filters by source', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(1)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([mockLead] as never)

    const token = await signToken()
    const res = await request('GET', '/api/leads?source=WEBSITE', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.lead.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'WEBSITE' }),
      })
    )
  })

  it('filters by assignedTo', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(1)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([mockLead] as never)

    const token = await signToken()
    const res = await request('GET', '/api/leads?assignedTo=user-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.lead.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigned_to: 'user-1' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.count).mockResolvedValue(50)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/leads?page=2&limit=10', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(5)
  })
})

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────

describe('GET /api/leads/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/leads/lead-1')
    expect(res.status).toBe(401)
  })

  it('returns lead with relations', async () => {
    const leadWithRelations = {
      ...mockLead,
      customer: { id: 'cust-1', name: 'Acme Corp', email: 'acme@example.com' },
      contact: null,
      assignee: null,
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(leadWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/leads/lead-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead.id).toBe('lead-1')
    expect(body.lead.customer).toBeDefined()
  })

  it('returns 404 when lead does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/leads/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lead not found')
  })
})

// ─── POST /api/leads ──────────────────────────────────────────────────────────

describe('POST /api/leads', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/leads', { title: 'Test Lead' })
    expect(res.status).toBe(401)
  })

  it('creates a lead successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/leads',
      { title: 'Potential sale to Acme', customerId: 'cust-1', source: 'WEBSITE', value: 50000 },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.lead.title).toBe('Potential sale to Acme')
  })

  it('defaults status to NEW', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.create).mockResolvedValue({ ...mockLead, status: 'NEW' } as never)

    const token = await signToken()
    const res = await request('POST', '/api/leads', { title: 'New Lead' }, token)

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.lead.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NEW' }),
      })
    )
  })

  it('returns 422 when title is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/leads', { source: 'WEBSITE' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/leads/:id ───────────────────────────────────────────────────────

describe('PUT /api/leads/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/leads/lead-1', { title: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('updates a lead successfully', async () => {
    const updated = { ...mockLead, title: 'Updated Title' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(mockLead as never)
    vi.mocked(prisma.lead.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/leads/lead-1', { title: 'Updated Title' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead.title).toBe('Updated Title')
  })

  it('returns 404 when lead does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/leads/nonexistent', { title: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lead not found')
  })

  it('allows valid status transition NEW -> CONTACTED', async () => {
    const updated = { ...mockLead, status: 'CONTACTED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(mockLead as never)
    vi.mocked(prisma.lead.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/leads/lead-1', { status: 'CONTACTED' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead.status).toBe('CONTACTED')
  })

  it('rejects invalid status transition NEW -> CONVERTED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(mockLead as never)

    const token = await signToken()
    const res = await request('PUT', '/api/leads/lead-1', { status: 'CONVERTED' }, token)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('Invalid status transition')
  })

  it('allows same status (no transition)', async () => {
    const updated = { ...mockLead, title: 'Same Status' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(mockLead as never)
    vi.mocked(prisma.lead.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/leads/lead-1', { status: 'NEW', title: 'Same Status' }, token)

    expect(res.status).toBe(200)
  })
})

// ─── DELETE /api/leads/:id ────────────────────────────────────────────────────

describe('DELETE /api/leads/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/leads/lead-1')
    expect(res.status).toBe(401)
  })

  it('deletes a lead successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(mockLead as never)
    vi.mocked(prisma.lead.delete).mockResolvedValue(mockLead as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/leads/lead-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when lead does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.lead.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/leads/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lead not found')
  })
})
