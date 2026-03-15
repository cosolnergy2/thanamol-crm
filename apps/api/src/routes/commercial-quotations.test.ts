import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    commercialQuotation: {
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
import { commercialQuotationsRoutes } from './commercial-quotations'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(commercialQuotationsRoutes)

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

const mockCQ = {
  id: 'cq-1',
  quotation_number: 'CQ-202603-0001',
  customer_id: 'cust-1',
  project_id: 'proj-1',
  items: [],
  terms: null,
  conditions: null,
  total_amount: 5000,
  status: 'DRAFT',
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockSentCQ = { ...mockCQ, status: 'SENT' }
const mockApprovedCQ = { ...mockCQ, status: 'APPROVED' }

const mockUserRoleWithManageContracts = [
  {
    role: {
      permissions: { manage_contracts: true },
    },
  },
]

const mockUserRoleWithoutPermission = [
  {
    role: {
      permissions: {},
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/commercial-quotations ──────────────────────────────────────────

describe('GET /api/commercial-quotations', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/commercial-quotations')
    expect(res.status).toBe(401)
  })

  it('returns paginated commercial quotation list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(1)
    vi.mocked(prisma.commercialQuotation.findMany).mockResolvedValue([mockCQ] as never)

    const token = await signToken()
    const res = await request('GET', '/api/commercial-quotations', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.commercialQuotation.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/commercial-quotations?status=SENT', undefined, token)

    expect(vi.mocked(prisma.commercialQuotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SENT' }),
      })
    )
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.commercialQuotation.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/commercial-quotations?projectId=proj-1', undefined, token)

    expect(vi.mocked(prisma.commercialQuotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-1' }),
      })
    )
  })
})

// ─── GET /api/commercial-quotations/pending ───────────────────────────────────

describe('GET /api/commercial-quotations/pending', () => {
  it('returns commercial quotations with SENT status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findMany).mockResolvedValue([mockSentCQ] as never)

    const token = await signToken()
    const res = await request('GET', '/api/commercial-quotations/pending', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(vi.mocked(prisma.commercialQuotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'SENT' },
      })
    )
  })
})

// ─── GET /api/commercial-quotations/:id ───────────────────────────────────────

describe('GET /api/commercial-quotations/:id', () => {
  it('returns commercial quotation with relations', async () => {
    const cqWithRelations = {
      ...mockCQ,
      customer: { id: 'cust-1', name: 'Acme', email: null, phone: null },
      project: { id: 'proj-1', name: 'Project A', code: 'PA' },
      creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(cqWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/commercial-quotations/cq-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.id).toBe('cq-1')
    expect(body.quotation.customer).toBeDefined()
    expect(body.quotation.creator).toBeDefined()
  })

  it('returns 404 when commercial quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/commercial-quotations/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Commercial quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/commercial-quotations/cq-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/commercial-quotations ─────────────────────────────────────────

describe('POST /api/commercial-quotations', () => {
  it('creates a commercial quotation and auto-generates quotation number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.commercialQuotation.create).mockResolvedValue(mockCQ as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations',
      { customerId: 'cust-1', projectId: 'proj-1' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.quotation.id).toBe('cq-1')
  })

  it('uses CQ- prefix for auto-generated number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.commercialQuotation.create).mockResolvedValue(mockCQ as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/commercial-quotations',
      { customerId: 'cust-1', projectId: 'proj-1' },
      token
    )

    expect(vi.mocked(prisma.commercialQuotation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quotation_number: expect.stringMatching(/^CQ-\d{6}-\d{4}$/),
        }),
      })
    )
  })

  it('defaults status to DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.commercialQuotation.create).mockResolvedValue(mockCQ as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/commercial-quotations',
      { customerId: 'cust-1', projectId: 'proj-1' },
      token
    )

    expect(vi.mocked(prisma.commercialQuotation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/commercial-quotations', {
      customerId: 'cust-1',
      projectId: 'proj-1',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when customerId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations',
      { projectId: 'proj-1' },
      token
    )
    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/commercial-quotations/:id ───────────────────────────────────────

describe('PUT /api/commercial-quotations/:id', () => {
  it('updates a commercial quotation successfully', async () => {
    const updated = { ...mockCQ, terms: 'Net 30' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockCQ as never)
    vi.mocked(prisma.commercialQuotation.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/commercial-quotations/cq-1',
      { terms: 'Net 30' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.terms).toBe('Net 30')
  })

  it('returns 404 when commercial quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/commercial-quotations/nonexistent',
      { terms: 'x' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Commercial quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/commercial-quotations/cq-1', { terms: 'x' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/commercial-quotations/:id ────────────────────────────────────

describe('DELETE /api/commercial-quotations/:id', () => {
  it('deletes a commercial quotation successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockCQ as never)
    vi.mocked(prisma.commercialQuotation.delete).mockResolvedValue(mockCQ as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/commercial-quotations/cq-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when commercial quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/commercial-quotations/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Commercial quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/commercial-quotations/cq-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/commercial-quotations/:id/approve ──────────────────────────────

describe('POST /api/commercial-quotations/:id/approve', () => {
  it('approves a sent commercial quotation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockSentCQ as never)
    vi.mocked(prisma.commercialQuotation.update).mockResolvedValue({
      ...mockSentCQ,
      status: 'APPROVED',
    } as never)

    const token = await signToken()
    const res = await request('POST', '/api/commercial-quotations/cq-1/approve', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.status).toBe('APPROVED')
  })

  it('returns 403 when user lacks manage_contracts permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithoutPermission as never
    )

    const token = await signToken()
    const res = await request('POST', '/api/commercial-quotations/cq-1/approve', undefined, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 409 when commercial quotation status is not SENT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockApprovedCQ as never)

    const token = await signToken()
    const res = await request('POST', '/api/commercial-quotations/cq-1/approve', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only sent quotations can be approved')
  })

  it('returns 404 when commercial quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations/nonexistent/approve',
      undefined,
      token
    )

    expect(res.status).toBe(404)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/commercial-quotations/cq-1/approve')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/commercial-quotations/:id/reject ───────────────────────────────

describe('POST /api/commercial-quotations/:id/reject', () => {
  it('rejects a sent commercial quotation with a reason', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockSentCQ as never)
    vi.mocked(prisma.commercialQuotation.update).mockResolvedValue({
      ...mockSentCQ,
      status: 'REJECTED',
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations/cq-1/reject',
      { reason: 'Scope changed' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.status).toBe('REJECTED')
    expect(body.reason).toBe('Scope changed')
  })

  it('returns 422 when reason is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )

    const token = await signToken()
    const res = await request('POST', '/api/commercial-quotations/cq-1/reject', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 403 when user lacks manage_contracts permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithoutPermission as never
    )

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations/cq-1/reject',
      { reason: 'Rejected' },
      token
    )

    expect(res.status).toBe(403)
  })

  it('returns 409 when commercial quotation status is not SENT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.commercialQuotation.findUnique).mockResolvedValue(mockApprovedCQ as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/commercial-quotations/cq-1/reject',
      { reason: 'Reason' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only sent quotations can be rejected')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/commercial-quotations/cq-1/reject', { reason: 'x' })
    expect(res.status).toBe(401)
  })
})
