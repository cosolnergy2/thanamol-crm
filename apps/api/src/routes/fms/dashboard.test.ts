import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    asset: { count: vi.fn(), findMany: vi.fn() },
    workOrder: { count: vi.fn(), findMany: vi.fn() },
    preventiveMaintenance: { count: vi.fn() },
    inventoryItem: { count: vi.fn(), findMany: vi.fn() },
    incident: { count: vi.fn(), findMany: vi.fn() },
    budget: { aggregate: vi.fn() },
    vendor: { count: vi.fn() },
    visitor: { count: vi.fn() },
    pMScheduleLog: { findMany: vi.fn() },
    stockMovement: { findMany: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsDashboardRoutes } from './dashboard'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsDashboardRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(method: string, path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(new Request(`http://localhost${path}`, { method, headers }))
}

const MOCK_USER = {
  id: 'user-1',
  email: 'user@test.com',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  phone: null,
  department: null,
  position: null,
  is_active: true,
  roles: [],
}

describe('GET /api/fms/dashboard/summary', () => {
  beforeEach(() => {
    vi.mocked(prisma.asset.count).mockResolvedValue(10)
    vi.mocked(prisma.workOrder.count).mockResolvedValue(5)
    vi.mocked(prisma.preventiveMaintenance.count).mockResolvedValue(3)
    vi.mocked(prisma.inventoryItem.count).mockResolvedValue(20)
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
      { current_stock: 2, reorder_point: 5 },
      { current_stock: 10, reorder_point: 5 },
    ] as never)
    vi.mocked(prisma.incident.count).mockResolvedValue(2)
    vi.mocked(prisma.budget.aggregate).mockResolvedValue({
      _sum: { total_approved: 100000, total_committed: 50000, total_actual: 40000 },
    } as never)
    vi.mocked(prisma.vendor.count).mockResolvedValue(8)
    vi.mocked(prisma.visitor.count).mockResolvedValue(3)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/dashboard/summary')
    expect(res.status).toBe(401)
  })

  it('returns summary with all sections', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/dashboard/summary', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('summary')
    expect(body.summary).toHaveProperty('assets')
    expect(body.summary).toHaveProperty('workOrders')
    expect(body.summary).toHaveProperty('preventiveMaintenance')
    expect(body.summary).toHaveProperty('inventory')
    expect(body.summary).toHaveProperty('incidents')
    expect(body.summary).toHaveProperty('budgets')
    expect(body.summary).toHaveProperty('vendors')
    expect(body.summary).toHaveProperty('visitors')
  })

  it('calculates lowStock correctly', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/dashboard/summary', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary.inventory.lowStock).toBe(1)
  })

  it('accepts optional projectId filter', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/dashboard/summary?projectId=proj-1', token)
    expect(res.status).toBe(200)
  })
})

describe('GET /api/fms/dashboard/recent-activity', () => {
  beforeEach(() => {
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([
      {
        id: 'wo-1',
        wo_number: 'WO-202503-0001',
        title: 'Fix AC',
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: new Date(),
      },
    ] as never)
    vi.mocked(prisma.incident.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.pMScheduleLog.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([] as never)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/dashboard/recent-activity')
    expect(res.status).toBe(401)
  })

  it('returns recent activity with all sections', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/dashboard/recent-activity', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('activity')
    expect(body.activity).toHaveProperty('workOrders')
    expect(body.activity).toHaveProperty('incidents')
    expect(body.activity).toHaveProperty('pmLogs')
    expect(body.activity).toHaveProperty('stockMovements')
  })

  it('accepts limit query param', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/dashboard/recent-activity?limit=5', token)
    expect(res.status).toBe(200)
  })
})
