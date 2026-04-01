import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workOrder: { findMany: vi.fn() },
    asset: { groupBy: vi.fn(), findMany: vi.fn() },
    budget: { findMany: vi.fn() },
    fireEquipment: { count: vi.fn() },
    permitToWork: { count: vi.fn() },
    incident: { groupBy: vi.fn() },
    insurancePolicy: { findMany: vi.fn() },
    preventiveMaintenance: { findMany: vi.fn() },
    vendor: { findMany: vi.fn() },
    calibrationRecord: { findMany: vi.fn() },
    inventoryItem: { findMany: vi.fn() },
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

describe('GET /api/fms/reports/predictive-maintenance', () => {
  const MOCK_ASSETS = [
    { id: 'asset-1', name: 'HVAC Unit A', warranty_expiry: new Date('2020-01-01') },
    { id: 'asset-2', name: 'Generator B', warranty_expiry: null },
    { id: 'asset-3', name: 'Elevator C', warranty_expiry: new Date('2030-12-31') },
  ]

  const MOCK_WORK_ORDERS_ASSET_1 = Array.from({ length: 4 }, (_, i) => ({
    asset_id: 'asset-1',
  }))

  function setupMocks(
    assets = MOCK_ASSETS,
    workOrders = [] as { asset_id: string }[],
    pmSchedules = [] as { asset_id: string | null }[],
    calibrations = [] as { asset_id: string; status: string; calibration_date: Date }[]
  ) {
    vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never)
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue(workOrders as never)
    vi.mocked(prisma.preventiveMaintenance.findMany).mockResolvedValue(pmSchedules as never)
    vi.mocked(prisma.calibrationRecord.findMany).mockResolvedValue(calibrations as never)
  }

  it('returns 401 when not authenticated', async () => {
    const res = await req('GET', '/api/fms/reports/predictive-maintenance?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId missing', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const res = await req('GET', '/api/fms/reports/predictive-maintenance', token)
    expect(res.status).toBe(400)
  })

  it('returns empty recommendations when no assets match rules', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    setupMocks([], [], [], [])

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.items).toHaveLength(0)
    expect(body.report.summary.total).toBe(0)
    expect(body.report.summary.high).toBe(0)
    expect(body.report.summary.medium).toBe(0)
    expect(body.report.summary.low).toBe(0)
  })

  it('flags HIGH risk for asset with more than 3 work orders in 90 days', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    setupMocks(MOCK_ASSETS, MOCK_WORK_ORDERS_ASSET_1, [], [])

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const highRiskItem = body.report.items.find(
      (i: { assetId: string }) => i.assetId === 'asset-1'
    )
    expect(highRiskItem).toBeDefined()
    expect(highRiskItem.riskLevel).toBe('HIGH')
    expect(body.report.summary.high).toBeGreaterThan(0)
  })

  it('flags MEDIUM risk for asset with expired warranty and no PM schedule', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    setupMocks(MOCK_ASSETS, [], [], [])

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const mediumItem = body.report.items.find(
      (i: { assetId: string }) => i.assetId === 'asset-1'
    )
    expect(mediumItem).toBeDefined()
    expect(mediumItem.riskLevel).toBe('MEDIUM')
  })

  it('does not flag expired warranty asset that has a PM schedule', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    setupMocks(MOCK_ASSETS, [], [{ asset_id: 'asset-1' }], [])

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const asset1Item = body.report.items.find(
      (i: { assetId: string }) => i.assetId === 'asset-1'
    )
    expect(asset1Item).toBeUndefined()
  })

  it('flags HIGH risk for asset with FAILED calibration', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const calibrations = [
      {
        asset_id: 'asset-2',
        status: 'FAILED',
        calibration_date: new Date('2025-01-01'),
      },
    ]
    setupMocks(MOCK_ASSETS, [], [], calibrations)

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const item = body.report.items.find((i: { assetId: string }) => i.assetId === 'asset-2')
    expect(item).toBeDefined()
    expect(item.riskLevel).toBe('HIGH')
  })

  it('flags MEDIUM risk for increasing deviation trend (2 of last 3 calibrations failed/overdue)', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const calibrations = [
      { asset_id: 'asset-2', status: 'PASSED', calibration_date: new Date('2024-06-01') },
      { asset_id: 'asset-2', status: 'OVERDUE', calibration_date: new Date('2024-09-01') },
      { asset_id: 'asset-2', status: 'OVERDUE', calibration_date: new Date('2025-01-01') },
    ]
    setupMocks(MOCK_ASSETS, [], [], calibrations)

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const item = body.report.items.find((i: { assetId: string }) => i.assetId === 'asset-2')
    expect(item).toBeDefined()
    expect(item.riskLevel).toBe('MEDIUM')
  })

  it('returns items sorted with HIGH risk first', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    const calibrations = [
      { asset_id: 'asset-2', status: 'FAILED', calibration_date: new Date('2025-01-01') },
    ]
    setupMocks(MOCK_ASSETS, [], [], calibrations)

    const res = await req(
      'GET',
      '/api/fms/reports/predictive-maintenance?projectId=proj-1',
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    const riskLevels = body.report.items.map((i: { riskLevel: string }) => i.riskLevel)
    const highIdx = riskLevels.indexOf('HIGH')
    const mediumIdx = riskLevels.indexOf('MEDIUM')
    if (highIdx !== -1 && mediumIdx !== -1) {
      expect(highIdx).toBeLessThan(mediumIdx)
    }
  })
})

describe('GET /api/fms/reports/inventory-analysis', () => {
  let token: string
  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    token = await signToken()
  })

  const now = new Date()
  const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
  const oldDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)

  const MOCK_ITEMS = [
    {
      id: 'item-1',
      item_code: 'IT-001',
      name: 'Filter A',
      unit_cost: 500,
      current_stock: 10,
      minimum_stock: 2,
      reorder_point: 3,
      lead_time_days: 14,
      is_active: true,
      stock_movements: [
        { id: 'sm-1', created_at: recentDate, quantity: 5, movement_type: 'OUT' },
        { id: 'sm-2', created_at: recentDate, quantity: 3, movement_type: 'OUT' },
      ],
    },
    {
      id: 'item-2',
      item_code: 'IT-002',
      name: 'Dead Part',
      unit_cost: 200,
      current_stock: 5,
      minimum_stock: 1,
      reorder_point: null,
      lead_time_days: null,
      is_active: true,
      stock_movements: [
        { id: 'sm-3', created_at: oldDate, quantity: 2, movement_type: 'OUT' },
      ],
    },
  ]

  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/reports/inventory-analysis')
    expect(res.status).toBe(401)
  })

  it('returns inventory analysis report', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(MOCK_ITEMS as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report).toBeDefined()
    expect(body.report.abcAnalysis).toBeDefined()
    expect(body.report.deadStock).toBeDefined()
    expect(body.report.consumptionTrends).toBeDefined()
    expect(body.report.reorderSuggestions).toBeDefined()
    expect(body.report.summary).toBeDefined()
  })

  it('identifies dead stock items — no movement in 90+ days', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(MOCK_ITEMS as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    const body = await res.json()
    const deadStockIds = body.report.deadStock.map((d: { itemId: string }) => d.itemId)
    expect(deadStockIds).toContain('item-2')
    expect(deadStockIds).not.toContain('item-1')
  })

  it('returns abc analysis with valid categories', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(MOCK_ITEMS as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    const body = await res.json()
    const categories = body.report.abcAnalysis.map((i: { category: string }) => i.category)
    expect(categories.every((c: string) => ['A', 'B', 'C'].includes(c))).toBe(true)
  })

  it('returns consumption trends only for items with recent movements', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(MOCK_ITEMS as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    const body = await res.json()
    const trendIds = body.report.consumptionTrends.map((t: { itemId: string }) => t.itemId)
    expect(trendIds).toContain('item-1')
  })

  it('passes projectId filter to database query', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([] as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis?projectId=proj-1', token)
    expect(res.status).toBe(200)
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-1' }),
      })
    )
  })

  it('returns summary with correct item counts', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue(MOCK_ITEMS as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    const body = await res.json()
    expect(body.report.summary.totalItems).toBe(2)
    expect(body.report.summary.totalDeadStockItems).toBe(1)
  })

  it('returns empty report for no items', async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([] as never)
    const res = await req('GET', '/api/fms/reports/inventory-analysis', token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.report.abcAnalysis).toHaveLength(0)
    expect(body.report.deadStock).toHaveLength(0)
    expect(body.report.summary.totalItems).toBe(0)
  })
})
