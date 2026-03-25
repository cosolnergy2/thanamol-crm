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
