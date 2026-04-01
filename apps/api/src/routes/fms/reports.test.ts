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
    preventiveMaintenance: { findMany: vi.fn() },
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

<<<<<<< HEAD
describe('GET /api/fms/reports/pm-compliance', () => {
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

  beforeEach(() => {
    vi.mocked(prisma.preventiveMaintenance.findMany).mockResolvedValue([
      {
        id: 'pm-1',
        pm_number: 'PM-202601-0001',
        title: 'HVAC Filter',
        next_due_date: futureDate,
        last_completed_date: null,
        frequency: 'MONTHLY',
      },
      {
        id: 'pm-2',
        pm_number: 'PM-202601-0002',
        title: 'Fire Pump',
        next_due_date: pastDate,
        last_completed_date: null,
        frequency: 'MONTHLY',
      },
      {
        id: 'pm-3',
        pm_number: 'PM-202601-0003',
        title: 'Generator',
        next_due_date: null,
        last_completed_date: null,
        frequency: 'MONTHLY',
      },
    ] as never)
  })

  it('requires authentication', async () => {
    const res = await req('GET', '/api/fms/reports/pm-compliance?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('requires projectId', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/pm-compliance', token)
    expect(res.status).toBe(400)
  })

  it('returns pm compliance report with correct counts', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)

    const res = await req('GET', '/api/fms/reports/pm-compliance?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.report.total).toBe(3)
    expect(body.report.onTimeCount).toBe(1)
    expect(body.report.overdueCount).toBe(1)
    expect(body.report.missedCount).toBe(1)
    expect(body.report.overdueList).toHaveLength(1)
    expect(body.report.overdueList[0].pm_number).toBe('PM-202601-0002')
  })

  it('returns 100% compliance when all PMs are on schedule', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findMany).mockResolvedValue([
      {
        id: 'pm-1',
        pm_number: 'PM-202601-0001',
        title: 'HVAC',
        next_due_date: futureDate,
        last_completed_date: null,
        frequency: 'MONTHLY',
      },
    ] as never)

    const res = await req('GET', '/api/fms/reports/pm-compliance?projectId=proj-1', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.compliancePercentage).toBe(100)
    expect(body.report.overdueList).toHaveLength(0)
  })
})

const MOCK_BUDGETS_WITH_LINES = [
  {
    id: 'budget-1',
    budget_code: 'BDG-2026-0001',
    title: 'Maintenance Budget 2026',
    fiscal_year: 2026,
    status: 'ACTIVE',
    total_approved: 100000,
    project: { id: 'proj-1', name: 'Project A', code: 'PA' },
    lines: [
      {
        id: 'line-1',
        budget_id: 'budget-1',
        category: 'HVAC',
=======
const MOCK_BUDGETS_WITH_LINES = [
  {
    id: 'budget-1',
    budget_code: 'BUD-2025-001',
    title: 'FY2025 Maintenance Budget',
    fiscal_year: 2025,
    status: 'ACTIVE',
    total_approved: 100000,
    project: { name: 'Tower A' },
    lines: [
      {
        id: 'line-1',
        category: 'HVAC',
        description: 'HVAC maintenance',
>>>>>>> feat/T-178-auto-reorder-budget-reports
        approved_amount: 60000,
        committed_amount: 10000,
        actual_amount: 45000,
      },
      {
        id: 'line-2',
<<<<<<< HEAD
        budget_id: 'budget-1',
        category: 'Electrical',
=======
        category: 'Electrical',
        description: 'Electrical work',
>>>>>>> feat/T-178-auto-reorder-budget-reports
        approved_amount: 40000,
        committed_amount: 5000,
        actual_amount: 30000,
      },
    ],
  },
]

describe('GET /api/fms/reports/budget-overview', () => {
<<<<<<< HEAD
  beforeEach(() => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
  })

=======
>>>>>>> feat/T-178-auto-reorder-budget-reports
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/budget-overview')
    expect(res.status).toBe(401)
  })

  it('returns budget overview summary', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
<<<<<<< HEAD
=======
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
>>>>>>> feat/T-178-auto-reorder-budget-reports

    const res = await req('GET', '/api/fms/reports/budget-overview', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.totalBudgets).toBe(1)
    expect(body.report.totalApprovedAmount).toBe(100000)
    expect(body.report.totalSpent).toBe(75000)
    expect(body.report.totalRemaining).toBe(25000)
<<<<<<< HEAD
    expect(body.report.byStatus).toHaveProperty('ACTIVE', 1)
=======
    expect(body.report.byStatus).toEqual({ ACTIVE: 1 })
>>>>>>> feat/T-178-auto-reorder-budget-reports
  })

  it('filters by fiscal year when provided', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
<<<<<<< HEAD

    await req('GET', '/api/fms/reports/budget-overview?fiscalYear=2026', token)

    const call = vi.mocked(prisma.budget.findMany).mock.calls[0][0]
    expect(call?.where).toMatchObject({ fiscal_year: 2026 })
=======
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)

    vi.mocked(prisma.budget.findMany).mockClear()
    await req('GET', '/api/fms/reports/budget-overview?fiscalYear=2025', token)

    const call = vi.mocked(prisma.budget.findMany).mock.calls[0]?.[0]
    expect(call?.where).toEqual({ fiscal_year: 2025 })
>>>>>>> feat/T-178-auto-reorder-budget-reports
  })
})

describe('GET /api/fms/reports/budget-vs-actual', () => {
<<<<<<< HEAD
  beforeEach(() => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
  })

=======
>>>>>>> feat/T-178-auto-reorder-budget-reports
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/budget-vs-actual')
    expect(res.status).toBe(401)
  })

<<<<<<< HEAD
  it('returns budget vs actual rows with variance and utilization', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
=======
  it('returns rows with computed variance and utilization', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
>>>>>>> feat/T-178-auto-reorder-budget-reports

    const res = await req('GET', '/api/fms/reports/budget-vs-actual', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    const row = body.report.rows[0]
<<<<<<< HEAD
    expect(row.budgetCode).toBe('BDG-2026-0001')
    expect(row.totalApproved).toBe(100000)
    expect(row.totalActual).toBe(75000)
    expect(row.variance).toBe(25000)
    expect(row.utilizationPct).toBe(75)
    expect(body.report.totals.totalApproved).toBe(100000)
    expect(body.report.totals.totalVariance).toBe(25000)
  })

  it('returns empty rows when no budgets match', async () => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
=======
    expect(row.variance).toBe(25000)
    expect(row.utilizationPct).toBe(75)
    expect(body.report.totals.totalApproved).toBe(100000)
    expect(body.report.totals.totalActual).toBe(75000)
  })

  it('returns empty rows when no budgets', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])
>>>>>>> feat/T-178-auto-reorder-budget-reports

    const res = await req('GET', '/api/fms/reports/budget-vs-actual', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.rows).toHaveLength(0)
  })
})

describe('GET /api/fms/reports/cost-report', () => {
<<<<<<< HEAD
  beforeEach(() => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
  })

=======
>>>>>>> feat/T-178-auto-reorder-budget-reports
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/cost-report')
    expect(res.status).toBe(401)
  })

  it('returns cost breakdown by category', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
<<<<<<< HEAD
=======
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)
>>>>>>> feat/T-178-auto-reorder-budget-reports

    const res = await req('GET', '/api/fms/reports/cost-report', token)
    expect(res.status).toBe(200)
    const body = await res.json()
<<<<<<< HEAD
    expect(body.report.rows).toHaveLength(2)
    expect(body.report.totalActual).toBe(75000)
    const hvac = body.report.rows.find((r: { category: string }) => r.category === 'HVAC')
    expect(hvac.actual).toBe(45000)
    expect(hvac.approved).toBe(60000)
  })

  it('returns empty rows and zero total when no budgets', async () => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
=======
    const hvac = body.report.rows.find((r: { category: string }) => r.category === 'HVAC')
    expect(hvac).toBeDefined()
    expect(hvac.actual).toBe(45000)
    expect(body.report.totalActual).toBe(75000)
  })

  it('returns empty rows when no budgets', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])
>>>>>>> feat/T-178-auto-reorder-budget-reports

    const res = await req('GET', '/api/fms/reports/cost-report', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.rows).toHaveLength(0)
<<<<<<< HEAD
    expect(body.report.totalActual).toBe(0)
=======
>>>>>>> feat/T-178-auto-reorder-budget-reports
  })
})
