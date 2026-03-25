import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    pettyCashFund: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    pettyCashTransaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsPettyCashRoutes } from './petty-cash'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsPettyCashRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(
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

const mockUser = {
  id: 'user-1',
  email: 'dev@example.com',
  first_name: 'Dev',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockFund = {
  id: 'fund-1',
  project_id: 'proj-1',
  fund_name: 'Office Fund',
  total_amount: 10000,
  current_balance: 8500,
  custodian_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  _count: { transactions: 2 },
}

const mockTransaction = {
  id: 'tx-1',
  transaction_number: 'PCT-202503-0001',
  fund_id: 'fund-1',
  project_id: 'proj-1',
  amount: 500,
  description: 'Office supplies',
  category: 'OFFICE_SUPPLIES',
  receipt_url: null,
  status: 'PENDING',
  requested_by: 'user-1',
  approved_by: null,
  transaction_date: new Date(),
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  fund: { id: 'fund-1', fund_name: 'Office Fund' },
  requester: { id: 'user-1', first_name: 'Dev', last_name: 'User' },
  approver: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/petty-cash/funds ────────────────────────────────────────────

describe('GET /api/fms/petty-cash/funds', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/petty-cash/funds')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of funds', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.count).mockResolvedValue(1)
    vi.mocked(prisma.pettyCashFund.findMany).mockResolvedValue([mockFund] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/petty-cash/funds', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].fund_name).toBe('Office Fund')
    expect(body.pagination.total).toBe(1)
  })

  it('filters funds by projectId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.count).mockResolvedValue(1)
    vi.mocked(prisma.pettyCashFund.findMany).mockResolvedValue([mockFund] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/petty-cash/funds?projectId=proj-1', undefined, token)

    expect(res.status).toBe(200)
    const callArgs = vi.mocked(prisma.pettyCashFund.findMany).mock.calls[0][0]
    expect((callArgs?.where as Record<string, string>)?.project_id).toBe('proj-1')
  })
})

// ─── POST /api/fms/petty-cash/funds ──────────────────────────────────────────

describe('POST /api/fms/petty-cash/funds', () => {
  it('creates a fund successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.create).mockResolvedValue(mockFund as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/funds',
      { projectId: 'proj-1', fundName: 'Office Fund', totalAmount: 10000 },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.fund.fund_name).toBe('Office Fund')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/funds',
      { fundName: 'Missing project' },
      token
    )

    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/petty-cash/funds', {
      projectId: 'proj-1',
      fundName: 'Test',
      totalAmount: 5000,
    })
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/fms/petty-cash/funds/:id ────────────────────────────────────────

describe('GET /api/fms/petty-cash/funds/:id', () => {
  it('returns fund with transactions', async () => {
    const fundWithTx = { ...mockFund, transactions: [], custodian: null }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(fundWithTx as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/petty-cash/funds/fund-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fund.id).toBe('fund-1')
    expect(body.fund.transactions).toEqual([])
  })

  it('returns 404 when fund does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/petty-cash/funds/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Fund not found')
  })
})

// ─── GET /api/fms/petty-cash/transactions ────────────────────────────────────

describe('GET /api/fms/petty-cash/transactions', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/petty-cash/transactions')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of transactions', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.count).mockResolvedValue(1)
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/petty-cash/transactions', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].transaction_number).toBe('PCT-202503-0001')
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.count).mockResolvedValue(1)
    vi.mocked(prisma.pettyCashTransaction.findMany).mockResolvedValue([mockTransaction] as never)

    const token = await signToken()
    const res = await req(
      'GET',
      '/api/fms/petty-cash/transactions?status=PENDING',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    const callArgs = vi.mocked(prisma.pettyCashTransaction.findMany).mock.calls[0][0]
    expect((callArgs?.where as Record<string, string>)?.status).toBe('PENDING')
  })
})

// ─── POST /api/fms/petty-cash/transactions ────────────────────────────────────

describe('POST /api/fms/petty-cash/transactions', () => {
  it('creates a transaction successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(mockFund as never)
    vi.mocked(prisma.pettyCashTransaction.count).mockResolvedValue(0)
    vi.mocked(prisma.pettyCashTransaction.create).mockResolvedValue(mockTransaction as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions',
      {
        fundId: 'fund-1',
        projectId: 'proj-1',
        amount: 500,
        description: 'Office supplies',
        requestedBy: 'user-1',
        transactionDate: '2025-03-01',
      },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.transaction.status).toBe('PENDING')
  })

  it('returns 404 when fund does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions',
      {
        fundId: 'ghost',
        projectId: 'proj-1',
        amount: 500,
        description: 'Test',
        requestedBy: 'user-1',
        transactionDate: '2025-03-01',
      },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Fund not found')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions',
      { fundId: 'fund-1' },
      token
    )

    expect(res.status).toBe(422)
  })
})

// ─── POST /api/fms/petty-cash/transactions/:id/approve ───────────────────────

describe('POST /api/fms/petty-cash/transactions/:id/approve', () => {
  it('approves a PENDING transaction and deducts from fund balance', async () => {
    const approvedTx = { ...mockTransaction, status: 'APPROVED', approved_by: 'user-1' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(mockTransaction as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(mockFund as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([approvedTx, mockFund] as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/tx-1/approve',
      { approvedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction.status).toBe('APPROVED')
  })

  it('returns 409 when transaction is not PENDING', async () => {
    const approvedTx = { ...mockTransaction, status: 'APPROVED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(approvedTx as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/tx-1/approve',
      { approvedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only PENDING transactions can be approved')
  })

  it('returns 409 when fund balance is insufficient', async () => {
    const lowBalanceFund = { ...mockFund, current_balance: 100 }
    const bigTx = { ...mockTransaction, amount: 500 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(bigTx as never)
    vi.mocked(prisma.pettyCashFund.findUnique).mockResolvedValue(lowBalanceFund as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/tx-1/approve',
      { approvedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Insufficient fund balance')
  })

  it('returns 404 when transaction does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/ghost/approve',
      { approvedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Transaction not found')
  })
})

// ─── POST /api/fms/petty-cash/transactions/:id/reject ────────────────────────

describe('POST /api/fms/petty-cash/transactions/:id/reject', () => {
  it('rejects a PENDING transaction', async () => {
    const rejectedTx = { ...mockTransaction, status: 'REJECTED', approved_by: 'user-1' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(mockTransaction as never)
    vi.mocked(prisma.pettyCashTransaction.update).mockResolvedValue(rejectedTx as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/tx-1/reject',
      { rejectedBy: 'user-1', reason: 'Out of budget' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction.status).toBe('REJECTED')
  })

  it('returns 409 when transaction is not PENDING', async () => {
    const rejectedTx = { ...mockTransaction, status: 'REJECTED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(rejectedTx as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/tx-1/reject',
      { rejectedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only PENDING transactions can be rejected')
  })

  it('returns 404 when transaction does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.pettyCashTransaction.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/petty-cash/transactions/ghost/reject',
      { rejectedBy: 'user-1' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Transaction not found')
  })
})
