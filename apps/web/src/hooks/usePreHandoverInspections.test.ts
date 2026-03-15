import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  usePreHandoverInspections,
  usePreHandoverInspectionById,
  useCreatePreHandoverInspection,
  useUpdatePreHandoverInspection,
  useDeletePreHandoverInspection,
  PRE_HANDOVER_QUERY_KEYS,
} from './usePreHandoverInspections'
import type { PreHandoverInspection, PreHandoverInspectionWithContract } from '@thanamol/shared'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)
const mockApiPut = vi.mocked(apiPut)
const mockApiDelete = vi.mocked(apiDelete)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockInspection: PreHandoverInspection = {
  id: 'insp-1',
  contract_id: 'contract-1',
  inspection_date: '2026-03-15T00:00:00.000Z',
  inspector: 'John Doe',
  items: [],
  overall_status: 'CONDITIONAL',
  notes: null,
  photos: [],
  created_at: '2026-03-15T00:00:00.000Z',
  updated_at: '2026-03-15T00:00:00.000Z',
}

const mockInspectionWithContract: PreHandoverInspectionWithContract = {
  ...mockInspection,
  contract: {
    id: 'contract-1',
    contract_number: 'CTR-001',
    type: 'LEASE',
    status: 'ACTIVE',
  },
}

describe('PRE_HANDOVER_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(PRE_HANDOVER_QUERY_KEYS.all).toEqual(['pre-handover-inspections'])
  })

  it('returns list key with params', () => {
    const key = PRE_HANDOVER_QUERY_KEYS.list({ page: 1, limit: 20 })
    expect(key).toEqual(['pre-handover-inspections', 'list', { page: 1, limit: 20 }])
  })

  it('returns detail key with id', () => {
    const key = PRE_HANDOVER_QUERY_KEYS.detail('insp-1')
    expect(key).toEqual(['pre-handover-inspections', 'insp-1'])
  })
})

describe('usePreHandoverInspections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches inspections list without filters', async () => {
    const mockResponse = {
      data: [mockInspectionWithContract],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    mockApiGet.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => usePreHandoverInspections(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiGet).toHaveBeenCalledWith('/pre-handover-inspections')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('fetches inspections with status filter', async () => {
    mockApiGet.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })

    const { result } = renderHook(() => usePreHandoverInspections({ status: 'PASS' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiGet).toHaveBeenCalledWith('/pre-handover-inspections?status=PASS')
  })

  it('handles fetch error gracefully', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePreHandoverInspections(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('usePreHandoverInspectionById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single inspection by id', async () => {
    mockApiGet.mockResolvedValue({ inspection: mockInspectionWithContract })

    const { result } = renderHook(() => usePreHandoverInspectionById('insp-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiGet).toHaveBeenCalledWith('/pre-handover-inspections/insp-1')
    expect(result.current.data?.inspection).toEqual(mockInspectionWithContract)
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => usePreHandoverInspectionById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('handles 404 error', async () => {
    mockApiGet.mockRejectedValue(new Error('Pre-handover inspection not found'))

    const { result } = renderHook(() => usePreHandoverInspectionById('nonexistent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreatePreHandoverInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an inspection and invalidates cache', async () => {
    mockApiPost.mockResolvedValue({ inspection: mockInspection })

    const { result } = renderHook(() => useCreatePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      contractId: 'contract-1',
      inspectionDate: '2026-03-15',
      inspector: 'John Doe',
    })

    expect(mockApiPost).toHaveBeenCalledWith('/pre-handover-inspections', {
      contractId: 'contract-1',
      inspectionDate: '2026-03-15',
      inspector: 'John Doe',
    })
  })

  it('propagates API errors', async () => {
    mockApiPost.mockRejectedValue(new Error('Contract not found'))

    const { result } = renderHook(() => useCreatePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({
        contractId: 'bad-id',
        inspectionDate: '2026-03-15',
        inspector: 'John Doe',
      }),
    ).rejects.toThrow('Contract not found')
  })
})

describe('useUpdatePreHandoverInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates an inspection', async () => {
    const updated = { ...mockInspection, overall_status: 'PASS' as const }
    mockApiPut.mockResolvedValue({ inspection: updated })

    const { result } = renderHook(() => useUpdatePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      id: 'insp-1',
      data: { overallStatus: 'PASS' },
    })

    expect(mockApiPut).toHaveBeenCalledWith('/pre-handover-inspections/insp-1', {
      overallStatus: 'PASS',
    })
  })

  it('propagates update errors', async () => {
    mockApiPut.mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useUpdatePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({ id: 'bad-id', data: { overallStatus: 'FAIL' } }),
    ).rejects.toThrow('Not found')
  })
})

describe('useDeletePreHandoverInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes an inspection', async () => {
    mockApiDelete.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeletePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('insp-1')

    expect(mockApiDelete).toHaveBeenCalledWith('/pre-handover-inspections/insp-1')
  })

  it('propagates delete errors', async () => {
    mockApiDelete.mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useDeletePreHandoverInspection(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.mutateAsync('bad-id')).rejects.toThrow('Not found')
  })
})
