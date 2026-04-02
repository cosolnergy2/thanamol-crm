import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '@/lib/api-client'
import {
  useFMSMaintenanceCostReport,
  useFMSAssetStatusReport,
  useFMSBudgetVarianceReport,
  useFMSComplianceStatusReport,
  useFMSBudgetOverviewReport,
  useFMSBudgetVsActualReport,
  useFMSCostReport,
  useInventoryAnalysisReport,
  FMS_REPORTS_QUERY_KEYS,
} from './useFMSReports'

const mockMaintenanceCost = { rows: [{ month: '2025-01', totalCost: 5000, workOrderCount: 2 }], totalCost: 5000 }
const mockAssetStatus = { rows: [{ status: 'OPERATIONAL', count: 8 }], total: 10 }
const mockBudgetVariance = { rows: [{ id: 'l1', category: 'Maint', description: null, approvedAmount: 50000, committedAmount: 30000, actualAmount: 25000, variance: 25000 }], totalApproved: 50000, totalActual: 25000, totalVariance: 25000 }
const mockCompliance = { fireEquipmentOverdue: 2, activePermitsToWork: 5, openIncidentsBySeverity: [], expiringInsurance: [] }

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useFMSMaintenanceCostReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useFMSMaintenanceCostReport({ projectId: '' }), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('fetches with projectId', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockMaintenanceCost })
    const { result } = renderHook(
      () => useFMSMaintenanceCostReport({ projectId: 'proj-1' }),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.totalCost).toBe(5000)
  })

  it('includes date range in API call', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockMaintenanceCost })
    const { result } = renderHook(
      () => useFMSMaintenanceCostReport({ projectId: 'proj-1', startDate: '2025-01-01', endDate: '2025-03-31' }),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining('startDate=2025-01-01')
    )
  })

  it('generates stable query keys', () => {
    const params = { projectId: 'proj-1', startDate: '2025-01-01' }
    expect(FMS_REPORTS_QUERY_KEYS.maintenanceCost(params)).toEqual(['fms-reports', 'maintenance-cost', params])
  })
})

describe('useFMSAssetStatusReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useFMSAssetStatusReport(''), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches asset status', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockAssetStatus })
    const { result } = renderHook(() => useFMSAssetStatusReport('proj-1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.total).toBe(10)
  })
})

describe('useFMSBudgetVarianceReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useFMSBudgetVarianceReport({ projectId: '' }), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches budget variance', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockBudgetVariance })
    const { result } = renderHook(() => useFMSBudgetVarianceReport({ projectId: 'proj-1' }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.totalVariance).toBe(25000)
  })
})

describe('useFMSComplianceStatusReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useFMSComplianceStatusReport(''), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches compliance status', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockCompliance })
    const { result } = renderHook(() => useFMSComplianceStatusReport('proj-1'), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.fireEquipmentOverdue).toBe(2)
    expect(result.current.data?.report.activePermitsToWork).toBe(5)
  })
})

const mockBudgetOverview = {
  totalBudgets: 3,
  totalApprovedAmount: 300000,
  totalSpent: 200000,
  totalRemaining: 100000,
  byStatus: { ACTIVE: 2, CLOSED: 1 },
}

const mockBudgetVsActual = {
  rows: [
    {
      id: 'b1',
      budgetCode: 'BUD-2025-001',
      title: 'FY2025 Budget',
      fiscalYear: 2025,
      status: 'ACTIVE',
      project: 'Tower A',
      totalApproved: 100000,
      totalActual: 75000,
      totalCommitted: 15000,
      variance: 25000,
      utilizationPct: 75,
    },
  ],
  totals: { totalApproved: 100000, totalActual: 75000, totalVariance: 25000 },
}

const mockCostReport = {
  rows: [
    { category: 'HVAC', approved: 60000, actual: 45000, committed: 10000 },
    { category: 'Electrical', approved: 40000, actual: 30000, committed: 5000 },
  ],
  totalActual: 75000,
}

describe('useFMSBudgetOverviewReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fetches budget overview without fiscal year', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockBudgetOverview })
    const { result } = renderHook(() => useFMSBudgetOverviewReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.totalBudgets).toBe(3)
    expect(apiGet).toHaveBeenCalledWith('/fms/reports/budget-overview')
  })

  it('includes fiscalYear in URL when provided', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockBudgetOverview })
    const { result } = renderHook(() => useFMSBudgetOverviewReport(2025), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('fiscalYear=2025'))
  })

  it('generates stable query keys', () => {
    expect(FMS_REPORTS_QUERY_KEYS.budgetOverview(2025)).toEqual(['fms-reports', 'budget-overview', 2025])
    expect(FMS_REPORTS_QUERY_KEYS.budgetOverview()).toEqual(['fms-reports', 'budget-overview', undefined])
  })
})

describe('useFMSBudgetVsActualReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fetches budget vs actual data with correct shape', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockBudgetVsActual })
    const { result } = renderHook(() => useFMSBudgetVsActualReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const row = result.current.data?.report.rows[0]
    expect(row?.variance).toBe(25000)
    expect(row?.utilizationPct).toBe(75)
    expect(result.current.data?.report.totals.totalVariance).toBe(25000)
  })
})

describe('useFMSCostReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fetches cost report rows', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockCostReport })
    const { result } = renderHook(() => useFMSCostReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.rows).toHaveLength(2)
    expect(result.current.data?.report.totalActual).toBe(75000)
  })

  it('includes fiscalYear in URL when provided', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockCostReport })
    const { result } = renderHook(() => useFMSCostReport(2025), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('fiscalYear=2025'))
  })
})

const mockInventoryAnalysis = {
  abcAnalysis: [
    { itemId: 'i1', itemCode: 'IT-001', itemName: 'Filter A', category: 'A', annualSpend: 50000, percentOfTotalSpend: 80 },
    { itemId: 'i2', itemCode: 'IT-002', itemName: 'Gasket B', category: 'C', annualSpend: 2000, percentOfTotalSpend: 3 },
  ],
  deadStock: [
    { itemId: 'i3', itemCode: 'IT-003', itemName: 'Old Part', lastMovementDate: '2024-01-01T00:00:00.000Z', daysSinceMovement: 365, currentStock: 5, stockValue: 2500 },
  ],
  consumptionTrends: [
    { itemId: 'i1', itemCode: 'IT-001', itemName: 'Filter A', totalConsumed: 100, movementCount: 12, avgMonthlyConsumption: 8.33 },
  ],
  reorderSuggestions: [
    { itemId: 'i1', itemCode: 'IT-001', itemName: 'Filter A', currentStock: 10, currentReorderPoint: 5, suggestedReorderPoint: 8, avgDailyConsumption: 0.27, leadTimeDays: 30, reason: 'Current reorder point too low.' },
  ],
  summary: { totalItems: 3, totalDeadStockItems: 1, totalDeadStockValue: 2500, aItemCount: 1, bItemCount: 0, cItemCount: 1 },
}

describe('useInventoryAnalysisReport', () => {
  beforeEach(() => vi.resetAllMocks())

  it('fetches inventory analysis without project filter', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockInventoryAnalysis })
    const { result } = renderHook(() => useInventoryAnalysisReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith('/fms/reports/inventory-analysis')
    expect(result.current.data?.report.summary.totalItems).toBe(3)
  })

  it('includes projectId in URL when provided', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockInventoryAnalysis })
    const { result } = renderHook(() => useInventoryAnalysisReport('proj-1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('projectId=proj-1'))
  })

  it('returns abc analysis with correct category', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockInventoryAnalysis })
    const { result } = renderHook(() => useInventoryAnalysisReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const abcItems = result.current.data?.report.abcAnalysis ?? []
    expect(abcItems[0].category).toBe('A')
    expect(abcItems[1].category).toBe('C')
  })

  it('returns dead stock items', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockInventoryAnalysis })
    const { result } = renderHook(() => useInventoryAnalysisReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.report.deadStock).toHaveLength(1)
    expect(result.current.data?.report.deadStock[0].daysSinceMovement).toBe(365)
  })

  it('returns reorder suggestions', async () => {
    vi.mocked(apiGet).mockResolvedValue({ report: mockInventoryAnalysis })
    const { result } = renderHook(() => useInventoryAnalysisReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const suggestions = result.current.data?.report.reorderSuggestions ?? []
    expect(suggestions[0].suggestedReorderPoint).toBe(8)
  })

  it('generates stable query keys', () => {
    expect(FMS_REPORTS_QUERY_KEYS.inventoryAnalysis('proj-1')).toEqual(['fms-reports', 'inventory-analysis', 'proj-1'])
    expect(FMS_REPORTS_QUERY_KEYS.inventoryAnalysis()).toEqual(['fms-reports', 'inventory-analysis', undefined])
  })
})
