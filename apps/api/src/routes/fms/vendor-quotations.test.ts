import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    vendorQuotation: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsVendorQuotationsRoutes } from './vendor-quotations'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsVendorQuotationsRoutes)

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

const mockVQ = {
  id: 'vq-1',
  quotation_number: 'Q2026-001',
  vendor_name: 'Vendor A',
  pr_id: 'pr-1',
  items: [{ item_name: 'Paper', quantity: 10, unit_price: 95, total: 950, lead_time_days: 3 }],
  total: 950,
  valid_until: null,
  notes: null,
  is_selected: false,
  created_at: new Date().toISOString(),
  purchase_request: { id: 'pr-1', pr_number: 'PR-202503-0001', title: 'Office Supplies' },
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

describe('GET /api/fms/vendor-quotations', () => {
  it('returns 401 without auth', async () => {
    const res = await req('GET', '/api/fms/vendor-quotations')
    expect(res.status).toBe(401)
  })

  it('returns paginated list', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.count).mockResolvedValue(1)
    vi.mocked(prisma.vendorQuotation.findMany).mockResolvedValue([mockVQ] as never)

    const res = await req('GET', '/api/fms/vendor-quotations', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
  })

  it('filters by prId', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.count).mockResolvedValue(0)
    vi.mocked(prisma.vendorQuotation.findMany).mockResolvedValue([])

    const res = await req('GET', '/api/fms/vendor-quotations?prId=pr-1', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.vendorQuotation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pr_id: 'pr-1' }),
      })
    )
  })
})

describe('POST /api/fms/vendor-quotations', () => {
  it('creates a vendor quotation', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.create).mockResolvedValue(mockVQ as never)

    const res = await req(
      'POST',
      '/api/fms/vendor-quotations',
      {
        vendorName: 'Vendor A',
        prId: 'pr-1',
        quotationNumber: 'Q2026-001',
        items: [{ item_name: 'Paper', quantity: 10, unit_price: 95, total: 950 }],
      },
      token
    )
    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.vendorQuotation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          total: 950,
          vendor_name: 'Vendor A',
        }),
      })
    )
  })
})

describe('POST /api/fms/vendor-quotations/:id/select', () => {
  it('selects a quotation and unselects others for same PR', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.findUnique).mockResolvedValue(mockVQ as never)
    vi.mocked(prisma.vendorQuotation.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.vendorQuotation.update).mockResolvedValue({
      ...mockVQ,
      is_selected: true,
    } as never)

    const res = await req('POST', '/api/fms/vendor-quotations/vq-1/select', undefined, token)
    expect(res.status).toBe(200)

    expect(vi.mocked(prisma.vendorQuotation.updateMany)).toHaveBeenCalledWith({
      where: { pr_id: 'pr-1', id: { not: 'vq-1' } },
      data: { is_selected: false },
    })

    const data = await res.json()
    expect(data.quotation.is_selected).toBe(true)
  })

  it('returns 404 for unknown quotation', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.findUnique).mockResolvedValue(null)

    const res = await req('POST', '/api/fms/vendor-quotations/unknown/select', undefined, token)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/fms/vendor-quotations/:id', () => {
  it('deletes a quotation', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.findUnique).mockResolvedValue(mockVQ as never)
    vi.mocked(prisma.vendorQuotation.delete).mockResolvedValue(mockVQ as never)

    const res = await req('DELETE', '/api/fms/vendor-quotations/vq-1', undefined, token)
    expect(res.status).toBe(200)
  })

  it('returns 404 for unknown quotation', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorQuotation.findUnique).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/vendor-quotations/unknown', undefined, token)
    expect(res.status).toBe(404)
  })
})
