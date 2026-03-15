import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  usePendingQuotations,
  useApproveQuotation,
  useRejectQuotation,
  QUOTATION_QUERY_KEYS,
} from './useQuotations'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePendingQuotations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches pending quotations from /quotations/pending', async () => {
    const mockResponse = {
      data: [
        {
          id: 'q1',
          quotation_number: 'QT-202603-0001',
          status: 'SENT',
          customer: { id: 'c1', name: 'ACME', email: null, phone: null },
          project: { id: 'p1', name: 'Project A', code: 'PA' },
          grand_total: 50000,
        },
      ],
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => usePendingQuotations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/quotations/pending')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('uses the correct query key', () => {
    expect(QUOTATION_QUERY_KEYS.pending()).toEqual(['quotations', 'pending'])
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => usePendingQuotations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useApproveQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /quotations/:id/approve', async () => {
    const mockResponse = { quotation: { id: 'q1', status: 'APPROVED' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useApproveQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('q1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(vi.mocked(apiClient.apiPost).mock.calls[0][0]).toBe('/quotations/q1/approve')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('returns error when approve fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Forbidden'))

    const { result } = renderHook(() => useApproveQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('q1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Forbidden')
  })
})

describe('useRejectQuotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /quotations/:id/reject with reason', async () => {
    const mockResponse = { quotation: { id: 'q1', status: 'REJECTED' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRejectQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'q1', data: { reason: 'Price too high' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/quotations/q1/reject', {
      reason: 'Price too high',
    })
  })

  it('returns error when reject fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useRejectQuotation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'bad-id', data: { reason: 'test' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
