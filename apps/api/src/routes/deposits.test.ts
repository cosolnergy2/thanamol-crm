import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    deposit: {
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
import { depositsRoutes } from './deposits'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(depositsRoutes)

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

const mockDeposit = {
  id: 'dep-1',
  contract_id: 'contract-1',
  customer_id: 'cust-1',
  amount: 50000,
  deposit_date: new Date('2026-03-01'),
  status: 'HELD',
  refund_date: null,
  refund_amount: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/deposits ────────────────────────────────────────────────────────

describe('GET /api/deposits', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/deposits')
    expect(res.status).toBe(401)
  })

  it('returns paginated deposit list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.count).mockResolvedValue(1)
    vi.mocked(prisma.deposit.findMany).mockResolvedValue([mockDeposit] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deposits', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by contractId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.count).mockResolvedValue(1)
    vi.mocked(prisma.deposit.findMany).mockResolvedValue([mockDeposit] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deposits?contractId=contract-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.deposit.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contract_id: 'contract-1' }),
      })
    )
  })

  it('filters by customerId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.count).mockResolvedValue(1)
    vi.mocked(prisma.deposit.findMany).mockResolvedValue([mockDeposit] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deposits?customerId=cust-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.deposit.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1' }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.count).mockResolvedValue(1)
    vi.mocked(prisma.deposit.findMany).mockResolvedValue([mockDeposit] as never)

    const token = await signToken()
    const res = await request('GET', '/api/deposits?status=HELD', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.deposit.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'HELD' }),
      })
    )
  })
})

// ─── GET /api/deposits/:id ────────────────────────────────────────────────────

describe('GET /api/deposits/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/deposits/dep-1')
    expect(res.status).toBe(401)
  })

  it('returns deposit with relations', async () => {
    const depositWithRelations = {
      ...mockDeposit,
      contract: { id: 'contract-1', contract_number: 'CT-202603-0001', type: 'SALE', status: 'ACTIVE' },
      customer: { id: 'cust-1', name: 'Test Customer', email: 'c@test.com', phone: null },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(depositWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/deposits/dep-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deposit.id).toBe('dep-1')
    expect(body.deposit.contract).toBeDefined()
    expect(body.deposit.customer).toBeDefined()
  })

  it('returns 404 when deposit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/deposits/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deposit not found')
  })
})

// ─── POST /api/deposits ───────────────────────────────────────────────────────

describe('POST /api/deposits', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/deposits', {
      contractId: 'contract-1',
      customerId: 'cust-1',
      amount: 50000,
      depositDate: '2026-03-01',
    })
    expect(res.status).toBe(401)
  })

  it('creates a deposit with default HELD status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.create).mockResolvedValue(mockDeposit as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/deposits',
      {
        contractId: 'contract-1',
        customerId: 'cust-1',
        amount: 50000,
        depositDate: '2026-03-01',
      },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.deposit.id).toBe('dep-1')
    expect(vi.mocked(prisma.deposit.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'HELD' }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/deposits', { contractId: 'contract-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/deposits/:id ────────────────────────────────────────────────────

describe('PUT /api/deposits/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/deposits/dep-1', { status: 'APPLIED' })
    expect(res.status).toBe(401)
  })

  it('transitions status from HELD to APPLIED successfully', async () => {
    const updated = { ...mockDeposit, status: 'APPLIED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(mockDeposit as never)
    vi.mocked(prisma.deposit.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deposits/dep-1', { status: 'APPLIED' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deposit.status).toBe('APPLIED')
  })

  it('transitions status from HELD to REFUNDED successfully', async () => {
    const updated = { ...mockDeposit, status: 'REFUNDED', refund_date: new Date('2026-04-01'), refund_amount: 50000 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(mockDeposit as never)
    vi.mocked(prisma.deposit.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/deposits/dep-1',
      { status: 'REFUNDED', refundDate: '2026-04-01', refundAmount: 50000 },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deposit.status).toBe('REFUNDED')
  })

  it('transitions status from HELD to FORFEITED successfully', async () => {
    const updated = { ...mockDeposit, status: 'FORFEITED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(mockDeposit as never)
    vi.mocked(prisma.deposit.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deposits/dep-1', { status: 'FORFEITED' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deposit.status).toBe('FORFEITED')
  })

  it('rejects invalid status transition APPLIED -> REFUNDED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue({ ...mockDeposit, status: 'APPLIED' } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deposits/dep-1', { status: 'REFUNDED' }, token)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('Invalid status transition')
  })

  it('rejects invalid status transition FORFEITED -> HELD', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue({ ...mockDeposit, status: 'FORFEITED' } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/deposits/dep-1', { status: 'HELD' }, token)

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toContain('Invalid status transition')
  })

  it('allows same status (no transition)', async () => {
    const updated = { ...mockDeposit, notes: 'Updated note' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(mockDeposit as never)
    vi.mocked(prisma.deposit.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/deposits/dep-1',
      { status: 'HELD', notes: 'Updated note' },
      token
    )

    expect(res.status).toBe(200)
  })

  it('returns 404 when deposit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/deposits/nonexistent', { notes: 'test' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deposit not found')
  })
})

// ─── DELETE /api/deposits/:id ─────────────────────────────────────────────────

describe('DELETE /api/deposits/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/deposits/dep-1')
    expect(res.status).toBe(401)
  })

  it('deletes a deposit successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(mockDeposit as never)
    vi.mocked(prisma.deposit.delete).mockResolvedValue(mockDeposit as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/deposits/dep-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when deposit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.deposit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/deposits/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Deposit not found')
  })
})
