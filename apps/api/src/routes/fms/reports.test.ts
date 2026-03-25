import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workOrder: { findMany: vi.fn() },
    asset: { groupBy: vi.fn() },
    budget: { findMany: vi.fn() },
    fireEquipment: { count: vi.fn() },
    permitToWork: { count: vi.fn() },
    incident: { groupBy: vi.fn() },
    insurancePolicy: { findMany: vi.fn() },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsReportsRoutes } from './reports'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsReportsRoutes)

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

describe('GET /api/fms/reports/maintenance-cost', () => {
  beforeEach(() => {
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([
      { actual_cost: 5000, created_at: new Date('2025-01-15') },
      { actual_cost: 3000, created_at: new Date('2025-01-20') },
      { actual_cost: null, created_at: new Date('2025-02-10') },
    ] as never)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/maintenance-cost?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId missing', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/maintenance-cost', token)
    expect(res.status).toBe(400)
  })

  it('returns maintenance cost grouped by month', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/reports/maintenance-cost?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('report')
    expect(body.report).toHaveProperty('rows')
    expect(body.report).toHaveProperty('totalCost')
    expect(body.report.rows.length).toBeGreaterThan(0)
    expect(body.report.totalCost).toBe(8000)
  })
})

describe('GET /api/fms/reports/asset-status', () => {
  beforeEach(() => {
    vi.mocked(prisma.asset.groupBy).mockResolvedValue([
      { status: 'OPERATIONAL', _count: { status: 8 } },
      { status: 'UNDER_MAINTENANCE', _count: { status: 2 } },
    ] as never)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/asset-status?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId missing', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/asset-status', token)
    expect(res.status).toBe(400)
  })

  it('returns asset status report', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/reports/asset-status?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('report')
    expect(body.report.total).toBe(10)
    expect(body.report.rows).toHaveLength(2)
  })
})

describe('GET /api/fms/reports/budget-variance', () => {
  beforeEach(() => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue([
      {
        id: 'budget-1',
        lines: [
          {
            id: 'line-1',
            category: 'Maintenance',
            description: 'Monthly maintenance',
            approved_amount: 50000,
            committed_amount: 30000,
            actual_amount: 25000,
          },
        ],
      },
    ] as never)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/budget-variance?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId missing', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/budget-variance', token)
    expect(res.status).toBe(400)
  })

  it('returns budget variance with positive variance when under budget', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/reports/budget-variance?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.rows[0].variance).toBe(25000)
    expect(body.report.totalVariance).toBe(25000)
  })
})

describe('GET /api/fms/reports/compliance-status', () => {
  beforeEach(() => {
    vi.mocked(prisma.fireEquipment.count).mockResolvedValue(2)
    vi.mocked(prisma.permitToWork.count).mockResolvedValue(5)
    vi.mocked(prisma.incident.groupBy).mockResolvedValue([
      { severity: 'MINOR', _count: { severity: 3 } },
      { severity: 'MAJOR', _count: { severity: 1 } },
    ] as never)
    vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([
      {
        id: 'pol-1',
        policy_number: 'POL-001',
        provider: 'TH Insurance',
        type: 'Property',
        end_date: new Date('2025-03-31'),
      },
    ] as never)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/compliance-status?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId missing', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/compliance-status', token)
    expect(res.status).toBe(400)
  })

  it('returns compliance status report', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/reports/compliance-status?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.fireEquipmentOverdue).toBe(2)
    expect(body.report.activePermitsToWork).toBe(5)
    expect(body.report.openIncidentsBySeverity).toHaveLength(2)
    expect(body.report.expiringInsurance).toHaveLength(1)
  })
})
