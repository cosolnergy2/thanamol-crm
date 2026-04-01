import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    vendor: { findUnique: vi.fn() },
    vendorInvoice: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    purchaseOrder: { findUnique: vi.fn() },
    goodsReceivedNote: { findMany: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsVendorInvoicesRoutes } from './vendor-invoices'

type ExtendedPrisma = typeof prisma & {
  purchaseOrder: { findUnique: ReturnType<typeof vi.fn> }
  goodsReceivedNote: { findMany: ReturnType<typeof vi.fn> }
}

const ep = prisma as unknown as ExtendedPrisma

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsVendorInvoicesRoutes)

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

const mockVendor = { id: 'vendor-1', name: 'ABC Co.', vendor_code: 'VND-202503-0001' }

const mockInvoice = {
  id: 'invoice-1',
  invoice_number: 'INV-2024-001',
  vendor_id: 'vendor-1',
  po_id: null,
  items: [{ description: 'Service fee', quantity: 1, unit_price: 10000, total: 10000 }],
  subtotal: 10000,
  tax: 700,
  total: 10700,
  invoice_date: new Date('2024-03-01'),
  due_date: new Date('2024-03-31'),
  payment_status: 'PENDING',
  payment_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  vendor: mockVendor,
}

const mockUser = {
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
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
})

describe('GET /api/fms/vendor-invoices', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/vendor-invoices')
    expect(res.status).toBe(401)
  })

  it('returns paginated invoice list', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findMany).mockResolvedValue([mockInvoice] as never)
    vi.mocked(prisma.vendorInvoice.count).mockResolvedValue(1)

    const res = await req('GET', '/api/fms/vendor-invoices', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })

  it('filters by vendorId', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.vendorInvoice.count).mockResolvedValue(0)

    await req('GET', '/api/fms/vendor-invoices?vendorId=vendor-1', undefined, token)

    const calls = vi.mocked(prisma.vendorInvoice.findMany).mock.calls
    const firstCallArg = calls[0]?.[0]
    expect(firstCallArg?.where).toMatchObject({ vendor_id: 'vendor-1' })
  })

  it('filters by paymentStatus', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.vendorInvoice.count).mockResolvedValue(0)

    await req('GET', '/api/fms/vendor-invoices?paymentStatus=PENDING', undefined, token)

    const calls2 = vi.mocked(prisma.vendorInvoice.findMany).mock.calls
    const secondCallArg = calls2[0]?.[0]
    expect(secondCallArg?.where).toMatchObject({ payment_status: 'PENDING' })
  })
})

describe('POST /api/fms/vendor-invoices', () => {
  it('creates an invoice', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(mockVendor as never)
    vi.mocked(prisma.vendorInvoice.create).mockResolvedValue(mockInvoice as never)

    const res = await req(
      'POST',
      '/api/fms/vendor-invoices',
      {
        invoiceNumber: 'INV-2024-001',
        vendorId: 'vendor-1',
        items: [{ description: 'Service fee', quantity: 1, unit_price: 10000, total: 10000 }],
        subtotal: 10000,
        tax: 700,
        total: 10700,
        invoiceDate: '2024-03-01',
        dueDate: '2024-03-31',
      },
      token
    )
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.invoice).toBeDefined()
    expect(json.invoice.invoice_number).toBe('INV-2024-001')
  })

  it('returns 404 when vendor not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null)

    const res = await req(
      'POST',
      '/api/fms/vendor-invoices',
      {
        invoiceNumber: 'INV-001',
        vendorId: 'nonexistent',
        items: [{ description: 'X', quantity: 1, unit_price: 100, total: 100 }],
        subtotal: 100,
        tax: 7,
        total: 107,
        invoiceDate: '2024-03-01',
      },
      token
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/vendor-invoices/:id/mark-paid', () => {
  it('marks invoice as paid', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(mockInvoice as never)
    const paid = { ...mockInvoice, payment_status: 'PAID', payment_date: new Date() }
    vi.mocked(prisma.vendorInvoice.update).mockResolvedValue(paid as never)

    const res = await req(
      'POST',
      '/api/fms/vendor-invoices/invoice-1/mark-paid',
      { paymentDate: '2024-03-15' },
      token
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.invoice.payment_status).toBe('PAID')
  })

  it('returns 404 when invoice not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(null)

    const res = await req(
      'POST',
      '/api/fms/vendor-invoices/nonexistent/mark-paid',
      {},
      token
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/fms/vendor-invoices/:id', () => {
  it('deletes invoice', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.vendorInvoice.delete).mockResolvedValue(mockInvoice as never)

    const res = await req('DELETE', '/api/fms/vendor-invoices/invoice-1', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('GET /api/fms/vendor-invoices/:id/three-way-match', () => {
  it('returns 404 when invoice not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(null)

    const res = await req('GET', '/api/fms/vendor-invoices/nonexistent/three-way-match', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns match with poLinked false when invoice has no PO', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(mockInvoice as never)

    const res = await req('GET', '/api/fms/vendor-invoices/invoice-1/three-way-match', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.match.poLinked).toBe(false)
    expect(json.match.invoiceId).toBe('invoice-1')
    expect(json.match.rows).toHaveLength(1)
    expect(json.match.rows[0].quantityMatch).toBeNull()
    expect(json.match.rows[0].priceMatch).toBeNull()
  })

  it('returns all matched when PO and GRN quantities and prices align', async () => {
    const token = await signToken()
    const invoiceWithPO = {
      ...mockInvoice,
      po_id: 'po-1',
      items: [{ description: 'Service fee', quantity: 2, unit_price: 5000, total: 10000 }],
      vendor: mockVendor,
    }
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(invoiceWithPO as never)
    ep.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      items: [{ item_name: 'Service fee', quantity: 2, unit_price: 5000, total: 10000 }],
      total_amount: 10000,
    })
    ep.goodsReceivedNote.findMany.mockResolvedValue([
      {
        id: 'grn-1',
        items: [{ item_name: 'Service fee', quantity: 2 }],
      },
    ])

    const res = await req('GET', '/api/fms/vendor-invoices/invoice-1/three-way-match', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.match.poLinked).toBe(true)
    expect(json.match.allMatched).toBe(true)
    expect(json.match.rows[0].quantityMatch).toBe(true)
    expect(json.match.rows[0].priceMatch).toBe(true)
  })

  it('detects price mismatch when PO price differs from invoice', async () => {
    const token = await signToken()
    const invoiceWithPO = {
      ...mockInvoice,
      po_id: 'po-1',
      items: [{ description: 'Service fee', quantity: 1, unit_price: 10000, total: 10000 }],
      vendor: mockVendor,
    }
    vi.mocked(prisma.vendorInvoice.findUnique).mockResolvedValue(invoiceWithPO as never)
    ep.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      items: [{ item_name: 'Service fee', quantity: 1, unit_price: 9000, total: 9000 }],
      total_amount: 9000,
    })
    ep.goodsReceivedNote.findMany.mockResolvedValue([])

    const res = await req('GET', '/api/fms/vendor-invoices/invoice-1/three-way-match', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.match.allMatched).toBe(false)
    expect(json.match.rows[0].priceMatch).toBe(false)
  })
})
