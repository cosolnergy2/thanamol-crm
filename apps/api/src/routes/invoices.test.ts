import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    invoice: {
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
import { invoicesRoutes } from './invoices'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(invoicesRoutes)

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

const mockInvoice = {
  id: 'inv-1',
  invoice_number: 'INV-202603-0001',
  contract_id: 'contract-1',
  customer_id: 'cust-1',
  items: [],
  subtotal: 10000,
  tax: 700,
  total: 10700,
  due_date: new Date('2026-04-01'),
  status: 'DRAFT',
  notes: null,
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/invoices ────────────────────────────────────────────────────────

describe('GET /api/invoices', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/invoices')
    expect(res.status).toBe(401)
  })

  it('returns paginated invoice list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)

    const token = await signToken()
    const res = await request('GET', '/api/invoices', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)

    const token = await signToken()
    const res = await request('GET', '/api/invoices?status=DRAFT', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.invoice.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('filters by customerId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)

    const token = await signToken()
    const res = await request('GET', '/api/invoices?customerId=cust-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.invoice.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1' }),
      })
    )
  })

  it('filters by contractId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)

    const token = await signToken()
    const res = await request('GET', '/api/invoices?contractId=contract-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.invoice.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contract_id: 'contract-1' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(30)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/invoices?page=2&limit=10', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(3)
  })
})

// ─── GET /api/invoices/:id ────────────────────────────────────────────────────

describe('GET /api/invoices/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/invoices/inv-1')
    expect(res.status).toBe(401)
  })

  it('returns invoice with relations', async () => {
    const invoiceWithRelations = {
      ...mockInvoice,
      customer: { id: 'cust-1', name: 'Test Customer', email: 'c@test.com', phone: null },
      contract: { id: 'contract-1', contract_number: 'CT-202603-0001', type: 'SALE', status: 'ACTIVE' },
      creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/invoices/inv-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice.id).toBe('inv-1')
    expect(body.invoice.customer).toBeDefined()
    expect(body.invoice.contract).toBeDefined()
    expect(body.invoice.creator).toBeDefined()
  })

  it('returns 404 when invoice does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/invoices/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Invoice not found')
  })
})

// ─── POST /api/invoices ───────────────────────────────────────────────────────

describe('POST /api/invoices', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/invoices', { customerId: 'cust-1' })
    expect(res.status).toBe(401)
  })

  it('creates an invoice and auto-generates invoice number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)
    vi.mocked(prisma.invoice.create).mockResolvedValue(mockInvoice as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/invoices',
      { customerId: 'cust-1', subtotal: 10000, tax: 700, total: 10700 },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.invoice.id).toBe('inv-1')
  })

  it('uses provided invoice number when given', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.create).mockResolvedValue({
      ...mockInvoice,
      invoice_number: 'INV-CUSTOM-0001',
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/invoices',
      { customerId: 'cust-1', invoiceNumber: 'INV-CUSTOM-0001' },
      token
    )

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.invoice.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoice_number: 'INV-CUSTOM-0001' }),
      })
    )
  })

  it('defaults status to DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)
    vi.mocked(prisma.invoice.create).mockResolvedValue(mockInvoice as never)

    const token = await signToken()
    await request('POST', '/api/invoices', { customerId: 'cust-1' }, token)

    expect(vi.mocked(prisma.invoice.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('returns 422 when customerId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/invoices', { subtotal: 1000 }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/invoices/:id ────────────────────────────────────────────────────

describe('PUT /api/invoices/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/invoices/inv-1', { status: 'SENT' })
    expect(res.status).toBe(401)
  })

  it('updates an invoice successfully', async () => {
    const updated = { ...mockInvoice, status: 'SENT' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/invoices/inv-1', { status: 'SENT' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice.status).toBe('SENT')
  })

  it('returns 404 when invoice does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/invoices/nonexistent', { status: 'SENT' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Invoice not found')
  })
})

// ─── DELETE /api/invoices/:id ─────────────────────────────────────────────────

describe('DELETE /api/invoices/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/invoices/inv-1')
    expect(res.status).toBe(401)
  })

  it('deletes a DRAFT invoice successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.invoice.delete).mockResolvedValue(mockInvoice as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/invoices/inv-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when invoice is not DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      ...mockInvoice,
      status: 'SENT',
    } as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/invoices/inv-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only DRAFT invoices can be deleted')
  })

  it('returns 404 when invoice does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/invoices/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Invoice not found')
  })
})
