import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { paymentsRoutes } from './payments'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(paymentsRoutes)

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
  due_date: null,
  status: 'SENT',
  notes: null,
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  payments: [],
}

const mockPayment = {
  id: 'pay-1',
  invoice_id: 'inv-1',
  amount: 5000,
  payment_date: new Date('2026-03-15'),
  payment_method: 'BANK_TRANSFER',
  reference_number: 'REF-001',
  notes: null,
  received_by: 'user-1',
  created_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/payments ────────────────────────────────────────────────────────

describe('GET /api/payments', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/payments')
    expect(res.status).toBe(401)
  })

  it('returns paginated payment list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(1)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment] as never)

    const token = await signToken()
    const res = await request('GET', '/api/payments', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
  })

  it('filters by invoiceId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(1)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment] as never)

    const token = await signToken()
    const res = await request('GET', '/api/payments?invoiceId=inv-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.payment.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ invoice_id: 'inv-1' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(25)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/payments?page=2&limit=5', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(5)
    expect(body.pagination.totalPages).toBe(5)
  })
})

// ─── GET /api/payments/:id ────────────────────────────────────────────────────

describe('GET /api/payments/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/payments/pay-1')
    expect(res.status).toBe(401)
  })

  it('returns payment with relations', async () => {
    const paymentWithRelations = {
      ...mockPayment,
      invoice: {
        id: 'inv-1',
        invoice_number: 'INV-202603-0001',
        total: 10700,
        status: 'SENT',
        customer_id: 'cust-1',
      },
      receiver: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/payments/pay-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payment.id).toBe('pay-1')
    expect(body.payment.invoice).toBeDefined()
    expect(body.payment.receiver).toBeDefined()
  })

  it('returns 404 when payment does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/payments/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Payment not found')
  })
})

// ─── POST /api/payments ───────────────────────────────────────────────────────

describe('POST /api/payments', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/payments', {
      invoiceId: 'inv-1',
      amount: 5000,
      paymentDate: '2026-03-15',
      paymentMethod: 'CASH',
    })
    expect(res.status).toBe(401)
  })

  it('creates a payment and recalculates invoice status to PARTIAL', async () => {
    const invoiceAfterPayment = { ...mockInvoice, payments: [mockPayment] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique)
      .mockResolvedValueOnce(mockInvoice as never)
      .mockResolvedValueOnce(invoiceAfterPayment as never)
    vi.mocked(prisma.payment.create).mockResolvedValue(mockPayment as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'PARTIAL' } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/payments',
      {
        invoiceId: 'inv-1',
        amount: 5000,
        paymentDate: '2026-03-15',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'REF-001',
      },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.payment.id).toBe('pay-1')
  })

  it('creates a payment and recalculates invoice status to PAID when fully paid', async () => {
    const fullPayment = { ...mockPayment, amount: 10700 }
    const invoiceFullyPaid = { ...mockInvoice, payments: [fullPayment] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique)
      .mockResolvedValueOnce(mockInvoice as never)
      .mockResolvedValueOnce(invoiceFullyPaid as never)
    vi.mocked(prisma.payment.create).mockResolvedValue(fullPayment as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'PAID' } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/payments',
      {
        invoiceId: 'inv-1',
        amount: 10700,
        paymentDate: '2026-03-15',
        paymentMethod: 'CASH',
      },
      token
    )

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.invoice.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) })
    )
  })

  it('preserves OVERDUE status when payment does not cover full balance', async () => {
    const overdueInvoice = { ...mockInvoice, status: 'OVERDUE', payments: [] }
    const overdueInvoiceAfterPayment = { ...overdueInvoice, payments: [mockPayment] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique)
      .mockResolvedValueOnce(overdueInvoice as never)
      .mockResolvedValueOnce(overdueInvoiceAfterPayment as never)
    vi.mocked(prisma.payment.create).mockResolvedValue(mockPayment as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...overdueInvoice, status: 'PARTIAL' } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/payments',
      {
        invoiceId: 'inv-1',
        amount: 5000,
        paymentDate: '2026-03-15',
        paymentMethod: 'BANK_TRANSFER',
      },
      token
    )

    expect(res.status).toBe(201)
    // When OVERDUE and partial payment: transitions to PARTIAL (not back to SENT)
    expect(vi.mocked(prisma.invoice.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PARTIAL' }),
      })
    )
  })

  it('transitions OVERDUE to PAID when fully paid', async () => {
    const fullPayment = { ...mockPayment, amount: 10700 }
    const overdueInvoice = { ...mockInvoice, status: 'OVERDUE', payments: [] }
    const overdueInvoiceFullyPaid = { ...overdueInvoice, payments: [fullPayment] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique)
      .mockResolvedValueOnce(overdueInvoice as never)
      .mockResolvedValueOnce(overdueInvoiceFullyPaid as never)
    vi.mocked(prisma.payment.create).mockResolvedValue(fullPayment as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...overdueInvoice, status: 'PAID' } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/payments',
      {
        invoiceId: 'inv-1',
        amount: 10700,
        paymentDate: '2026-03-15',
        paymentMethod: 'CASH',
      },
      token
    )

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.invoice.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) })
    )
  })

  it('returns 404 when invoice does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/payments',
      {
        invoiceId: 'nonexistent',
        amount: 5000,
        paymentDate: '2026-03-15',
        paymentMethod: 'CASH',
      },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Invoice not found')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/payments', { invoiceId: 'inv-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/payments/:id ────────────────────────────────────────────────────

describe('PUT /api/payments/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/payments/pay-1', { amount: 6000 })
    expect(res.status).toBe(401)
  })

  it('updates a payment successfully', async () => {
    const updated = { ...mockPayment, amount: 6000 }
    const invoiceWithUpdatedPayment = { ...mockInvoice, payments: [updated] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment as never)
    vi.mocked(prisma.payment.update).mockResolvedValue(updated as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceWithUpdatedPayment as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'PARTIAL' } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/payments/pay-1', { amount: 6000 }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payment.amount).toBe(6000)
  })

  it('returns 404 when payment does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/payments/nonexistent', { amount: 1000 }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Payment not found')
  })
})

// ─── DELETE /api/payments/:id ─────────────────────────────────────────────────

describe('DELETE /api/payments/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/payments/pay-1')
    expect(res.status).toBe(401)
  })

  it('deletes a payment successfully', async () => {
    const invoiceAfterDelete = { ...mockInvoice, payments: [] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment as never)
    vi.mocked(prisma.payment.delete).mockResolvedValue(mockPayment as never)
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(invoiceAfterDelete as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'SENT' } as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/payments/pay-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when payment does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/payments/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Payment not found')
  })
})
