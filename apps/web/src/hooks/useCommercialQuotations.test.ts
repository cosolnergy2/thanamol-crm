import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useCommercialQuotations,
  useCommercialQuotation,
  useCreateCommercialQuotation,
  useUpdateCommercialQuotation,
  useDeleteCommercialQuotation,
  usePendingCommercialQuotations,
  useApproveCommercialQuotation,
  useRejectCommercialQuotation,
  COMMERCIAL_QUOTATION_QUERY_KEYS,
} from './useCommercialQuotations'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCommercialQuotations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches list from /commercial-quotations', async () => {
    const mockResponse = {
      data: [{ id: 'cq1', quotation_number: 'CQ-202603-0001', status: 'DRAFT', total_amount: 0 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCommercialQuotations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/commercial-quotations')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })

    const { result } = renderHook(
      () => useCommercialQuotations({ status: 'SENT', page: 2 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isFetching).toBe(false))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/commercial-quotations?page=2&status=SENT')
  })
})

describe('useCommercialQuotation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches single quotation from /commercial-quotations/:id', async () => {
    const mockResponse = {
      quotation: { id: 'cq1', quotation_number: 'CQ-202603-0001', status: 'DRAFT' },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCommercialQuotation('cq1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/commercial-quotations/cq1')
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useCommercialQuotation(''), {
      wrapper: createWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCommercialQuotation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /commercial-quotations', async () => {
    const mockResponse = { quotation: { id: 'cq1', quotation_number: 'CQ-202603-0001' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: 'c1', projectId: 'p1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith('/commercial-quotations', {
      customerId: 'c1',
      projectId: 'p1',
    })
  })

  it('returns error when creation fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation error'))

    const { result } = renderHook(() => useCreateCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: '', projectId: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation error')
  })
})

describe('useUpdateCommercialQuotation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /commercial-quotations/:id', async () => {
    const mockResponse = { quotation: { id: 'cq1', status: 'SENT' } }
    vi.mocked(apiClient.apiPut).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useUpdateCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'cq1', data: { status: 'SENT' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/commercial-quotations/cq1', { status: 'SENT' })
  })
})

describe('useDeleteCommercialQuotation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /commercial-quotations/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('cq1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/commercial-quotations/cq1')
  })

  it('returns error when delete fails', async () => {
    vi.mocked(apiClient.apiDelete).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useDeleteCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('bad-id')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('usePendingCommercialQuotations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches pending commercial quotations from /commercial-quotations/pending', async () => {
    const mockResponse = {
      data: [
        {
          id: 'cq1',
          quotation_number: 'CQ-202603-0001',
          status: 'SENT',
          customer: { id: 'c1', name: 'ACME', email: null, phone: null },
          project: { id: 'p1', name: 'Project A', code: 'PA' },
          total_amount: 100000,
        },
      ],
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => usePendingCommercialQuotations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/commercial-quotations/pending')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('uses the correct query key', () => {
    expect(COMMERCIAL_QUOTATION_QUERY_KEYS.pending()).toEqual([
      'commercialQuotations',
      'pending',
    ])
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => usePendingCommercialQuotations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useApproveCommercialQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /commercial-quotations/:id/approve', async () => {
    const mockResponse = { quotation: { id: 'cq1', status: 'APPROVED' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useApproveCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('cq1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(vi.mocked(apiClient.apiPost).mock.calls[0][0]).toBe(
      '/commercial-quotations/cq1/approve'
    )
  })

  it('returns error when approve fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Forbidden'))

    const { result } = renderHook(() => useApproveCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('cq1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Forbidden')
  })
})

describe('useRejectCommercialQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /commercial-quotations/:id/reject with reason', async () => {
    const mockResponse = { quotation: { id: 'cq1', status: 'REJECTED' }, reason: 'Too costly' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRejectCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'cq1', data: { reason: 'Too costly' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/commercial-quotations/cq1/reject', {
      reason: 'Too costly',
    })
  })

  it('returns error when reject fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useRejectCommercialQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'bad-id', data: { reason: 'test' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
