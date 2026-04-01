import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    purchaseRequest: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    purchaseOrder: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsPurchaseRequestsRoutes } from './purchase-requests'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsPurchaseRequestsRoutes)

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
      body: body ? JSON.stringify(body) : undefined,
    })
  )
}

const mockPR = {
  id: 'pr-1',
  pr_number: 'PR-202503-0001',
  title: 'Office Supplies',
  description: null,
  project_id: null,
  items: [{ item_name: 'Paper', quantity: 10, estimated_unit_price: 100, total: 1000 }],
  estimated_total: 1000,
  priority: 'MEDIUM',
  status: 'DRAFT',
  requested_by: 'user-1',
  approved_by: null,
  approved_at: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: null,
  requester: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
  approver: null,
  purchase_orders: [],
  vendor_quotations: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user-1',
    email: 'test@test.com',
    password_hash: '',
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    department: null,
    position: null,
    avatar_url: null,
    is_active: true,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    roles: [],
  } as never)
})

describe('GET /api/fms/purchase-requests', () => {
  it('returns 401 without auth', async () => {
    const res = await req('GET', '/api/fms/purchase-requests')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with auth', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(1)
    vi.mocked(prisma.purchaseRequest.findMany).mockResolvedValue([mockPR] as never)

    const res = await req('GET', '/api/fms/purchase-requests', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseRequest.findMany).mockResolvedValue([])

    const res = await req('GET', '/api/fms/purchase-requests?status=APPROVED', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.purchaseRequest.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'APPROVED' }),
      })
    )
  })
})

describe('GET /api/fms/purchase-requests/:id', () => {
  it('returns 404 for unknown id', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(null)

    const res = await req('GET', '/api/fms/purchase-requests/unknown', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns PR by id', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)

    const res = await req('GET', '/api/fms/purchase-requests/pr-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pr.pr_number).toBe('PR-202503-0001')
  })
})

describe('POST /api/fms/purchase-requests', () => {
  it('creates a PR and returns 201', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseRequest.create).mockResolvedValue(mockPR as never)

    const res = await req(
      'POST',
      '/api/fms/purchase-requests',
      {
        title: 'Office Supplies',
        items: [{ item_name: 'Paper', quantity: 10, estimated_unit_price: 100 }],
        requestedBy: 'user-1',
      },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.pr.pr_number).toBe('PR-202503-0001')
  })

  it('returns 422 for missing required fields', async () => {
    const token = await signToken()
    const res = await req('POST', '/api/fms/purchase-requests', { title: '' }, token)
    expect(res.status).toBe(422)
  })

  it('creates a PR with new fields: purpose, requiredDate, companyId, conditions, documents', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseRequest.create).mockResolvedValue({
      ...mockPR,
      purpose: 'Stock Replenishment',
      company_id: 'co-1',
      conditions: { vat: true, withholding_tax: false },
    } as never)

    const res = await req(
      'POST',
      '/api/fms/purchase-requests',
      {
        title: 'Stock Order',
        items: [{ item_name: 'Filter', quantity: 5, estimated_unit_price: 200, item_type: 'วัสดุ', mode: 'buy' }],
        requestedBy: 'user-1',
        purpose: 'Stock Replenishment',
        companyId: 'co-1',
        requiredDate: '2026-05-01',
        pmScheduleId: 'pm-1',
        documents: [{ url: 'https://example.com/doc.pdf' }],
        conditions: { vat: true, withholding_tax: false, installments: [] },
      },
      token
    )
    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.purchaseRequest.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purpose: 'Stock Replenishment',
          company_id: 'co-1',
          pm_schedule_id: 'pm-1',
        }),
      })
    )
  })

  it('creates a PR with item fields: mode, budget_code, specification, category, asset_id', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseRequest.create).mockResolvedValue(mockPR as never)

    const res = await req(
      'POST',
      '/api/fms/purchase-requests',
      {
        title: 'Equipment Rental',
        items: [
          {
            item_name: 'Scaffold',
            quantity: 1,
            estimated_unit_price: 5000,
            item_type: 'งานเหมา',
            mode: 'rent',
            budget_code: 'BUD-001',
            supplier: 'ABC Co.',
            specification: 'Steel scaffold 10m',
            category: 'วัสดุ',
            asset_id: 'asset-1',
          },
        ],
        requestedBy: 'user-1',
      },
      token
    )
    expect(res.status).toBe(201)
  })
})

describe('PUT /api/fms/purchase-requests/:id', () => {
  it('updates a draft PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)
    vi.mocked(prisma.purchaseRequest.update).mockResolvedValue({
      ...mockPR,
      title: 'Updated Title',
    } as never)

    const res = await req('PUT', '/api/fms/purchase-requests/pr-1', { title: 'Updated Title' }, token)
    expect(res.status).toBe(200)
  })

  it('returns 400 when editing non-draft PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'SUBMITTED',
    } as never)

    const res = await req('PUT', '/api/fms/purchase-requests/pr-1', { title: 'New' }, token)
    expect(res.status).toBe(400)
  })

  it('updates a draft PR with new conditions and purpose fields', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)
    vi.mocked(prisma.purchaseRequest.update).mockResolvedValue({
      ...mockPR,
      purpose: 'Emergency',
      conditions: { vat: true },
    } as never)

    const res = await req(
      'PUT',
      '/api/fms/purchase-requests/pr-1',
      {
        purpose: 'Emergency',
        requiredDate: '2026-06-01',
        conditions: { vat: true, withholding_tax: true, installments: [] },
        siteId: 'project-1',
        unitId: 'unit-1',
      },
      token
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/fms/purchase-requests/:id/submit', () => {
  it('submits a draft PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)
    vi.mocked(prisma.purchaseRequest.update).mockResolvedValue({
      ...mockPR,
      status: 'SUBMITTED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/submit', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pr.status).toBe('SUBMITTED')
  })

  it('returns 400 when PR is not draft', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'APPROVED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/submit', undefined, token)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/fms/purchase-requests/:id/approve', () => {
  it('approves a submitted PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'SUBMITTED',
    } as never)
    vi.mocked(prisma.purchaseRequest.update).mockResolvedValue({
      ...mockPR,
      status: 'APPROVED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/approve', { approvedBy: 'user-2' }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pr.status).toBe('APPROVED')
  })
})

describe('POST /api/fms/purchase-requests/:id/reject', () => {
  it('rejects a submitted PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'SUBMITTED',
    } as never)
    vi.mocked(prisma.purchaseRequest.update).mockResolvedValue({
      ...mockPR,
      status: 'REJECTED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/reject', { reason: 'Budget exceeded' }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.pr.status).toBe('REJECTED')
  })
})

describe('POST /api/fms/purchase-requests/:id/convert', () => {
  it('converts an approved PR to PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'APPROVED',
    } as never)
    vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0)

    const mockPO = {
      id: 'po-1',
      po_number: 'PO-202503-0001',
      status: 'DRAFT',
      total: 1070,
      project: null,
      creator: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
      approver: null,
      purchase_request: mockPR,
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      if (typeof fn === 'function') {
        return fn({
          purchaseRequest: { update: vi.fn().mockResolvedValue({ ...mockPR, status: 'CONVERTED' }) },
          purchaseOrder: { create: vi.fn().mockResolvedValue(mockPO) },
        } as never)
      }
      return fn as ReturnType<typeof fn>
    })

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/convert', { vendorName: 'Supplier Co.' }, token)
    expect(res.status).toBe(201)
  })

  it('returns 400 when PR is not approved', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)

    const res = await req('POST', '/api/fms/purchase-requests/pr-1/convert', {}, token)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/fms/purchase-requests/:id', () => {
  it('deletes a draft PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue(mockPR as never)
    vi.mocked(prisma.purchaseRequest.delete).mockResolvedValue(mockPR as never)

    const res = await req('DELETE', '/api/fms/purchase-requests/pr-1', undefined, token)
    expect(res.status).toBe(200)
  })

  it('returns 400 when deleting non-draft PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseRequest.findUnique).mockResolvedValue({
      ...mockPR,
      status: 'SUBMITTED',
    } as never)

    const res = await req('DELETE', '/api/fms/purchase-requests/pr-1', undefined, token)
    expect(res.status).toBe(400)
  })
})
