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
    vendor: { findMany: vi.fn() },
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
        approved_amount: 60000,
        committed_amount: 10000,
        actual_amount: 45000,
      },
      {
        id: 'line-2',
        category: 'Electrical',
        description: 'Electrical work',
        approved_amount: 40000,
        committed_amount: 5000,
        actual_amount: 30000,
      },
    ],
  },
]

describe('GET /api/fms/reports/budget-overview', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/budget-overview')
    expect(res.status).toBe(401)
  })

  it('returns budget overview summary', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)

    const res = await req('GET', '/api/fms/reports/budget-overview', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.totalBudgets).toBe(1)
    expect(body.report.totalApprovedAmount).toBe(100000)
    expect(body.report.totalSpent).toBe(75000)
    expect(body.report.totalRemaining).toBe(25000)
    expect(body.report.byStatus).toEqual({ ACTIVE: 1 })
  })

  it('filters by fiscal year when provided', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)

    vi.mocked(prisma.budget.findMany).mockClear()
    await req('GET', '/api/fms/reports/budget-overview?fiscalYear=2025', token)

    const call = vi.mocked(prisma.budget.findMany).mock.calls[0]?.[0]
    expect(call?.where).toEqual({ fiscal_year: 2025 })
  })
})

describe('GET /api/fms/reports/budget-vs-actual', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/budget-vs-actual')
    expect(res.status).toBe(401)
  })

  it('returns rows with computed variance and utilization', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)

    const res = await req('GET', '/api/fms/reports/budget-vs-actual', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    const row = body.report.rows[0]
    expect(row.variance).toBe(25000)
    expect(row.utilizationPct).toBe(75)
    expect(body.report.totals.totalApproved).toBe(100000)
    expect(body.report.totals.totalActual).toBe(75000)
  })

  it('returns empty rows when no budgets', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])

    const res = await req('GET', '/api/fms/reports/budget-vs-actual', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.rows).toHaveLength(0)
  })
})

describe('GET /api/fms/reports/cost-report', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/cost-report')
    expect(res.status).toBe(401)
  })

  it('returns cost breakdown by category', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue(MOCK_BUDGETS_WITH_LINES as never)

    const res = await req('GET', '/api/fms/reports/cost-report', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    const hvac = body.report.rows.find((r: { category: string }) => r.category === 'HVAC')
    expect(hvac).toBeDefined()
    expect(hvac.actual).toBe(45000)
    expect(body.report.totalActual).toBe(75000)
  })

  it('returns empty rows when no budgets', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.budget.findMany).mockResolvedValue([])

    const res = await req('GET', '/api/fms/reports/cost-report', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.rows).toHaveLength(0)
  })
})

const MOCK_VENDORS_WITH_CONTRACTS = [
  {
    id: 'vendor-1',
    vendor_code: 'VND-202503-0001',
    name: 'ABC Maintenance Co.',
    status: 'ACTIVE',
    // The mock returns only ACTIVE contracts (matching the select where filter behavior)
    contracts: [{ id: 'contract-1' }],
    invoices: [
      { id: 'inv-1', total: 10000, payment_status: 'PAID' },
      { id: 'inv-2', total: 5000, payment_status: 'PENDING' },
    ],
  },
  {
    id: 'vendor-2',
    vendor_code: 'VND-202503-0002',
    name: 'XYZ Security Ltd.',
    status: 'INACTIVE',
    contracts: [],
    invoices: [],
  },
]

describe('GET /api/fms/reports/vendor-summary', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/vendor-summary')
    expect(res.status).toBe(401)
  })

  it('returns vendor summary with totals', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.vendor.findMany).mockResolvedValue(MOCK_VENDORS_WITH_CONTRACTS as never)

    const res = await req('GET', '/api/fms/reports/vendor-summary', token)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.report).toBeDefined()
    expect(body.report.totals.totalVendors).toBe(2)
    expect(body.report.totals.activeVendors).toBe(1)
    expect(body.report.totals.totalActiveContracts).toBe(1)
    expect(body.report.totals.totalSpend).toBe(15000)
    expect(body.report.rows).toHaveLength(2)
  })

  it('returns correct invoice status summary per vendor', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.vendor.findMany).mockResolvedValue(MOCK_VENDORS_WITH_CONTRACTS as never)

    const res = await req('GET', '/api/fms/reports/vendor-summary', token)
    expect(res.status).toBe(200)

    const body = await res.json()
    const vendor1Row = body.report.rows.find((r: { vendorId: string }) => r.vendorId === 'vendor-1')
    expect(vendor1Row).toBeDefined()
    expect(vendor1Row.totalInvoices).toBe(2)
    expect(vendor1Row.totalSpend).toBe(15000)
    expect(vendor1Row.invoiceStatusSummary.PAID).toBe(1)
    expect(vendor1Row.invoiceStatusSummary.PENDING).toBe(1)
  })

  it('returns empty rows when no vendors', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([])

    const res = await req('GET', '/api/fms/reports/vendor-summary', token)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.report.rows).toHaveLength(0)
    expect(body.report.totals.totalVendors).toBe(0)
  })
})
