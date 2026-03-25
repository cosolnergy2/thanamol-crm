import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    purchaseOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsPurchaseOrdersRoutes } from './purchase-orders'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsPurchaseOrdersRoutes)

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

const mockPO = {
  id: 'po-1',
  po_number: 'PO-202503-0001',
  pr_id: null,
  vendor_name: 'Supplier Co.',
  project_id: null,
  items: [{ item_name: 'Paper', quantity: 10, unit_price: 100, total: 1000 }],
  subtotal: 1000,
  tax: 70,
  total: 1070,
  status: 'DRAFT',
  delivery_date: null,
  payment_terms: null,
  notes: null,
  created_by: 'user-1',
  approved_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: null,
  purchase_request: null,
  creator: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
  approver: null,
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

describe('GET /api/fms/purchase-orders', () => {
  it('returns 401 without auth', async () => {
    const res = await req('GET', '/api/fms/purchase-orders')
    expect(res.status).toBe(401)
  })

  it('returns paginated list', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(1)
    vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([mockPO] as never)

    const res = await req('GET', '/api/fms/purchase-orders', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
  })
})

describe('POST /api/fms/purchase-orders', () => {
  it('creates a PO with auto-calculated totals', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseOrder.create).mockResolvedValue(mockPO as never)

    const res = await req(
      'POST',
      '/api/fms/purchase-orders',
      {
        vendorName: 'Supplier Co.',
        items: [{ item_name: 'Paper', quantity: 10, unit_price: 100, total: 1000 }],
        createdBy: 'user-1',
      },
      token
    )
    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.purchaseOrder.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 1000,
          tax: 70,
          total: 1070,
        }),
      })
    )
  })
})

describe('POST /api/fms/purchase-orders/:id/issue', () => {
  it('issues a draft PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(mockPO as never)
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({
      ...mockPO,
      status: 'ISSUED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/issue', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.po.status).toBe('ISSUED')
  })

  it('returns 400 when issuing non-draft PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...mockPO,
      status: 'ISSUED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/issue', undefined, token)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/fms/purchase-orders/:id/receive', () => {
  it('marks PO as partially received', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...mockPO,
      status: 'ISSUED',
    } as never)
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({
      ...mockPO,
      status: 'PARTIALLY_RECEIVED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/receive', { fullyReceived: false }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.po.status).toBe('PARTIALLY_RECEIVED')
  })

  it('marks PO as fully received', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...mockPO,
      status: 'ISSUED',
    } as never)
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({
      ...mockPO,
      status: 'FULLY_RECEIVED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/receive', { fullyReceived: true }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.po.status).toBe('FULLY_RECEIVED')
  })
})

describe('POST /api/fms/purchase-orders/:id/cancel', () => {
  it('cancels an issued PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...mockPO,
      status: 'ISSUED',
    } as never)
    vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({
      ...mockPO,
      status: 'CANCELLED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/cancel', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.po.status).toBe('CANCELLED')
  })

  it('returns 400 when cancelling fully received PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
      ...mockPO,
      status: 'FULLY_RECEIVED',
    } as never)

    const res = await req('POST', '/api/fms/purchase-orders/po-1/cancel', undefined, token)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/fms/purchase-orders/:id', () => {
  it('deletes a draft PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(mockPO as never)
    vi.mocked(prisma.purchaseOrder.delete).mockResolvedValue(mockPO as never)

    const res = await req('DELETE', '/api/fms/purchase-orders/po-1', undefined, token)
    expect(res.status).toBe(200)
  })

  it('returns 404 for unknown PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/purchase-orders/unknown', undefined, token)
    expect(res.status).toBe(404)
  })
})
