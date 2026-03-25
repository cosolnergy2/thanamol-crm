import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    budget: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsBudgetsRoutes } from './budgets'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsBudgetsRoutes)

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
      body: body ? JSON.stringify(body) : undefined,
    })
  )
}

const mockBudget = {
  id: 'budget-1',
  budget_code: 'BDG-2026-0001',
  title: 'Annual Budget 2026',
  project_id: 'project-1',
  fiscal_year: 2026,
  period_start: new Date('2026-01-01'),
  period_end: new Date('2026-12-31'),
  total_approved: 1000000,
  total_committed: 0,
  total_actual: 0,
  status: 'DRAFT',
  notes: null,
  created_by: 'user-1',
  approved_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'project-1', name: 'Test Project', code: 'TP-001' },
  creator: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
  approver: null,
  lines: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'user-1',
    email: 'test@test.com',
    password_hash: '',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    avatar_url: null,
    phone: null,
    department: null,
    position: null,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    roles: [],
  } as never)
})

describe('GET /api/fms/budgets', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await req('GET', '/api/fms/budgets')
    expect(res.status).toBe(401)
  })

  it('returns paginated budgets', async () => {
    vi.mocked(prisma.budget.count).mockResolvedValue(1)
    vi.mocked(prisma.budget.findMany).mockResolvedValue([mockBudget] as never)
    const token = await signToken()
    const res = await req('GET', '/api/fms/budgets', undefined, token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })
})

describe('GET /api/fms/budgets/:id', () => {
  it('returns budget detail', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue({
      ...mockBudget,
      transactions: [],
    } as never)
    const token = await signToken()
    const res = await req('GET', '/api/fms/budgets/budget-1', undefined, token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.budget.id).toBe('budget-1')
  })

  it('returns 404 for missing budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue(null)
    const token = await signToken()
    const res = await req('GET', '/api/fms/budgets/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/budgets', () => {
  it('creates a new budget with auto-generated code', async () => {
    vi.mocked(prisma.budget.count).mockResolvedValue(0)
    vi.mocked(prisma.budget.create).mockResolvedValue(mockBudget as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/budgets',
      {
        title: 'Annual Budget 2026',
        projectId: 'project-1',
        fiscalYear: 2026,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        totalApproved: 1000000,
        createdBy: 'user-1',
      },
      token
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.budget.budget_code).toBe('BDG-2026-0001')
  })

  it('rejects invalid body', async () => {
    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets', { title: '' }, token)
    expect(res.status).toBe(422)
  })
})

describe('POST /api/fms/budgets/:id/approve', () => {
  it('approves a DRAFT budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue(mockBudget as never)
    vi.mocked(prisma.budget.update).mockResolvedValue({
      ...mockBudget,
      status: 'APPROVED',
    } as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/approve', {}, token)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.budget.status).toBe('APPROVED')
  })

  it('rejects approval of non-DRAFT budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue({
      ...mockBudget,
      status: 'ACTIVE',
    } as never)
    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/approve', {}, token)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/fms/budgets/:id/activate', () => {
  it('activates an APPROVED budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue({
      ...mockBudget,
      status: 'APPROVED',
    } as never)
    vi.mocked(prisma.budget.update).mockResolvedValue({
      ...mockBudget,
      status: 'ACTIVE',
    } as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/activate', {}, token)
    expect(res.status).toBe(200)
  })

  it('rejects activation of non-APPROVED budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue(mockBudget as never)
    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/activate', {}, token)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/fms/budgets/:id/close', () => {
  it('closes an ACTIVE budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue({
      ...mockBudget,
      status: 'ACTIVE',
    } as never)
    vi.mocked(prisma.budget.update).mockResolvedValue({
      ...mockBudget,
      status: 'CLOSED',
    } as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/close', {}, token)
    expect(res.status).toBe(200)
  })

  it('rejects closing a non-ACTIVE budget', async () => {
    vi.mocked(prisma.budget.findUnique).mockResolvedValue({
      ...mockBudget,
      status: 'DRAFT',
    } as never)
    const token = await signToken()
    const res = await req('POST', '/api/fms/budgets/budget-1/close', {}, token)
    expect(res.status).toBe(400)
  })
})
