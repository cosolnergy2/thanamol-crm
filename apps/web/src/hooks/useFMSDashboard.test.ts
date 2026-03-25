import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '@/lib/api-client'
import { useFMSDashboardSummary, useFMSRecentActivity, FMS_DASHBOARD_QUERY_KEYS } from './useFMSDashboard'

const mockSummary = {
  assets: { total: 10, operational: 7, underMaintenance: 2, outOfService: 1 },
  workOrders: { total: 5, open: 2, inProgress: 1, completed: 2 },
  preventiveMaintenance: { active: 3, overdue: 1 },
  inventory: { totalItems: 20, lowStock: 2 },
  incidents: { open: 1, investigating: 0 },
  budgets: { totalApproved: 100000, totalCommitted: 50000, totalActual: 40000 },
  vendors: { active: 8 },
  visitors: { todayCheckedIn: 3 },
}

const mockActivity = {
  workOrders: [{ id: 'wo-1', wo_number: 'WO-001', title: 'Fix AC', status: 'OPEN', priority: 'MEDIUM', created_at: '2025-03-01' }],
  incidents: [],
  pmLogs: [],
  stockMovements: [],
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useFMSDashboardSummary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches dashboard summary without projectId', async () => {
    vi.mocked(apiGet).mockResolvedValue({ summary: mockSummary })
    const { result } = renderHook(() => useFMSDashboardSummary(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.summary).toEqual(mockSummary)
    expect(apiGet).toHaveBeenCalledWith('/fms/dashboard/summary')
  })

  it('fetches dashboard summary with projectId', async () => {
    vi.mocked(apiGet).mockResolvedValue({ summary: mockSummary })
    const { result } = renderHook(() => useFMSDashboardSummary('proj-1'), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith('/fms/dashboard/summary?projectId=proj-1')
  })

  it('generates stable query keys by projectId', () => {
    expect(FMS_DASHBOARD_QUERY_KEYS.summary('proj-1')).toEqual(['fms-dashboard', 'summary', 'proj-1'])
    expect(FMS_DASHBOARD_QUERY_KEYS.summary()).toEqual(['fms-dashboard', 'summary', undefined])
  })

  it('handles API error', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useFMSDashboardSummary(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useFMSRecentActivity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches recent activity', async () => {
    vi.mocked(apiGet).mockResolvedValue({ activity: mockActivity })
    const { result } = renderHook(() => useFMSRecentActivity(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.activity.workOrders).toHaveLength(1)
  })

  it('passes limit to API call', async () => {
    vi.mocked(apiGet).mockResolvedValue({ activity: mockActivity })
    const { result } = renderHook(() => useFMSRecentActivity('proj-1', 5), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiGet).toHaveBeenCalledWith('/fms/dashboard/recent-activity?projectId=proj-1&limit=5')
  })
})
