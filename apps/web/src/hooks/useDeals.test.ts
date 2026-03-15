import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useDeals,
  useDeal,
  useDealPipeline,
  useCreateDeal,
  useUpdateDeal,
  useDeleteDeal,
} from './useDeals'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches deals with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', title: 'Test Deal', stage: 'PROSPECTING' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useDeals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/deals')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with stage filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useDeals({ stage: 'NEGOTIATION', page: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('stage=NEGOTIATION'),
    )
  })

  it('excludes "all" filter value from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useDeals({ stage: 'all', assignedTo: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('stage=all')
    expect(call).not.toContain('assignedTo=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDeals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDealPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches pipeline data', async () => {
    const mockPipeline = {
      pipeline: [
        { stage: 'PROSPECTING', deals: [], count: 0, totalValue: 0 },
      ],
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockPipeline)

    const { result } = renderHook(() => useDealPipeline(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/deals/pipeline')
    expect(result.current.data).toEqual(mockPipeline)
  })
})

describe('useDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches single deal by id', async () => {
    const mockDeal = { id: 'deal-1', title: 'Test Deal', stage: 'PROSPECTING' }
    vi.mocked(apiClient.apiGet).mockResolvedValue({ deal: mockDeal })

    const { result } = renderHook(() => useDeal('deal-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/deals/deal-1')
    expect(result.current.data).toEqual({ deal: mockDeal })
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ deal: null })

    const { result } = renderHook(() => useDeal(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /deals and returns deal', async () => {
    const mockDeal = { id: '2', title: 'New Deal', stage: 'PROSPECTING' }
    vi.mocked(apiClient.apiPost).mockResolvedValue({ deal: mockDeal })

    const { result } = renderHook(() => useCreateDeal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ title: 'New Deal' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/deals', { title: 'New Deal' })
    expect(result.current.data).toEqual({ deal: mockDeal })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateDeal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ title: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /deals/:id', async () => {
    const mockDeal = { id: 'deal-1', title: 'Updated', stage: 'QUALIFICATION' }
    vi.mocked(apiClient.apiPut).mockResolvedValue({ deal: mockDeal })

    const { result } = renderHook(() => useUpdateDeal('deal-1'), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ stage: 'QUALIFICATION' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/deals/deal-1', { stage: 'QUALIFICATION' })
  })
})

describe('useDeleteDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /deals/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteDeal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('deal-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/deals/deal-1')
  })
})
