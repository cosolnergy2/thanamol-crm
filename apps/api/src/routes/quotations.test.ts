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
    quotation: {
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
import { quotationsRoutes } from './quotations'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(quotationsRoutes)

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

const mockQuotation = {
  id: 'qt-1',
  quotation_number: 'QT-202603-0001',
  customer_id: 'cust-1',
  project_id: 'proj-1',
  unit_id: null,
  items: [],
  total_amount: 1000,
  discount: 0,
  tax: 0,
  grand_total: 1000,
  status: 'DRAFT',
  valid_until: null,
  notes: null,
  approved_by: null,
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockSentQuotation = { ...mockQuotation, status: 'SENT' }
const mockApprovedQuotation = { ...mockQuotation, status: 'APPROVED' }

const mockUserRoleWithManageContracts = [
  {
    role: {
      permissions: { quotations: { view: true, create: true, edit: true, approve: true } },
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

// ─── GET /api/quotations ──────────────────────────────────────────────────────

describe('GET /api/quotations', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/quotations')
    expect(res.status).toBe(401)
  })

  it('returns paginated quotation list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(1)
    vi.mocked(prisma.quotation.findMany).mockResolvedValue([mockQuotation] as never)

    const token = await signToken()
    const res = await request('GET', '/api/quotations', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(0)
    vi.mocked(prisma.quotation.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/quotations?status=DRAFT', undefined, token)

    expect(vi.mocked(prisma.quotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('filters by customerId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(0)
    vi.mocked(prisma.quotation.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/quotations?customerId=cust-1', undefined, token)

    expect(vi.mocked(prisma.quotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1' }),
      })
    )
  })

  it('searches by quotation_number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(0)
    vi.mocked(prisma.quotation.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/quotations?search=QT-2026', undefined, token)

    expect(vi.mocked(prisma.quotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quotation_number: { contains: 'QT-2026', mode: 'insensitive' },
        }),
      })
    )
  })
})

// ─── GET /api/quotations/pending ─────────────────────────────────────────────

describe('GET /api/quotations/pending', () => {
  it('returns quotations with SENT status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findMany).mockResolvedValue([mockSentQuotation] as never)

    const token = await signToken()
    const res = await request('GET', '/api/quotations/pending', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(vi.mocked(prisma.quotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'SENT' },
      })
    )
  })
})

// ─── GET /api/quotations/:id ──────────────────────────────────────────────────

describe('GET /api/quotations/:id', () => {
  it('returns quotation with relations', async () => {
    const quotationWithRelations = {
      ...mockQuotation,
      customer: { id: 'cust-1', name: 'Acme', email: null, phone: null },
      project: { id: 'proj-1', name: 'Project A', code: 'PA' },
      unit: null,
      creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
      approver: null,
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(quotationWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/quotations/qt-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.id).toBe('qt-1')
    expect(body.quotation.customer).toBeDefined()
    expect(body.quotation.creator).toBeDefined()
  })

  it('returns 404 when quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/quotations/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/quotations/qt-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/quotations ─────────────────────────────────────────────────────

describe('POST /api/quotations', () => {
  it('creates a quotation and auto-generates quotation number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(0)
    vi.mocked(prisma.quotation.create).mockResolvedValue(mockQuotation as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/quotations',
      { customerId: 'cust-1', projectId: 'proj-1' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.quotation.id).toBe('qt-1')
  })

  it('uses provided quotation number when given', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.create).mockResolvedValue({
      ...mockQuotation,
      quotation_number: 'QT-CUSTOM-001',
    } as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/quotations',
      { customerId: 'cust-1', projectId: 'proj-1', quotationNumber: 'QT-CUSTOM-001' },
      token
    )

    expect(vi.mocked(prisma.quotation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quotation_number: 'QT-CUSTOM-001' }),
      })
    )
  })

  it('defaults status to DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.count).mockResolvedValue(0)
    vi.mocked(prisma.quotation.create).mockResolvedValue(mockQuotation as never)

    const token = await signToken()
    await request('POST', '/api/quotations', { customerId: 'cust-1', projectId: 'proj-1' }, token)

    expect(vi.mocked(prisma.quotation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/quotations', { customerId: 'cust-1', projectId: 'proj-1' })
    expect(res.status).toBe(401)
  })

  it('returns 422 when customerId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/quotations', { projectId: 'proj-1' }, token)
    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/quotations/:id ──────────────────────────────────────────────────

describe('PUT /api/quotations/:id', () => {
  it('updates a quotation successfully', async () => {
    const updated = { ...mockQuotation, notes: 'Updated notes' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockQuotation as never)
    vi.mocked(prisma.quotation.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/quotations/qt-1', { notes: 'Updated notes' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.notes).toBe('Updated notes')
  })

  it('returns 404 when quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/quotations/nonexistent', { notes: 'x' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/quotations/qt-1', { notes: 'x' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/quotations/:id ───────────────────────────────────────────────

describe('DELETE /api/quotations/:id', () => {
  it('deletes a quotation successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockQuotation as never)
    vi.mocked(prisma.quotation.delete).mockResolvedValue(mockQuotation as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/quotations/qt-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/quotations/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Quotation not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/quotations/qt-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/quotations/:id/approve ────────────────────────────────────────

describe('POST /api/quotations/:id/approve', () => {
  it('approves a sent quotation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockSentQuotation as never)
    vi.mocked(prisma.quotation.update).mockResolvedValue({
      ...mockSentQuotation,
      status: 'APPROVED',
      approved_by: 'user-1',
    } as never)

    const token = await signToken()
    const res = await request('POST', '/api/quotations/qt-1/approve', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.status).toBe('APPROVED')
    expect(vi.mocked(prisma.quotation.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', approved_by: 'user-1' }),
      })
    )
  })

  it('returns 403 when user lacks quotations.approve permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithoutPermission as never
    )

    const token = await signToken()
    const res = await request('POST', '/api/quotations/qt-1/approve', undefined, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 409 when quotation status is not SENT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockApprovedQuotation as never)

    const token = await signToken()
    const res = await request('POST', '/api/quotations/qt-1/approve', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only sent quotations can be approved')
  })

  it('returns 404 when quotation does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('POST', '/api/quotations/nonexistent/approve', undefined, token)

    expect(res.status).toBe(404)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/quotations/qt-1/approve')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/quotations/:id/reject ─────────────────────────────────────────

describe('POST /api/quotations/:id/reject', () => {
  it('rejects a sent quotation with a reason', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockSentQuotation as never)
    vi.mocked(prisma.quotation.update).mockResolvedValue({
      ...mockSentQuotation,
      status: 'REJECTED',
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/quotations/qt-1/reject',
      { reason: 'Price too high' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quotation.status).toBe('REJECTED')
  })

  it('returns 422 when reason is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )

    const token = await signToken()
    const res = await request('POST', '/api/quotations/qt-1/reject', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 403 when user lacks quotations.approve permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithoutPermission as never
    )

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/quotations/qt-1/reject',
      { reason: 'Rejected' },
      token
    )

    expect(res.status).toBe(403)
  })

  it('returns 409 when quotation status is not SENT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(
      mockUserRoleWithManageContracts as never
    )
    vi.mocked(prisma.quotation.findUnique).mockResolvedValue(mockApprovedQuotation as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/quotations/qt-1/reject',
      { reason: 'Reason' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only sent quotations can be rejected')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/quotations/qt-1/reject', { reason: 'x' })
    expect(res.status).toBe(401)
  })
})
