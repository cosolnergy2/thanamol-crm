import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useHandovers,
  useHandoverById,
  useCreateHandover,
  useUpdateHandover,
  useDeleteHandover,
} from './useHandovers'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useHandovers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches handovers with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', contract_id: 'c1', status: 'PENDING' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useHandovers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/handovers')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with contractId and status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useHandovers({ contractId: 'c1', status: 'PENDING' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('contractId=c1'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=PENDING'),
    )
  })

  it('excludes "all" status value from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useHandovers({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHandovers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useHandoverById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches handover by id', async () => {
    const mockHandover = { id: 'h1', contract_id: 'c1', status: 'PENDING' }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockHandover)

    const { result } = renderHook(() => useHandoverById('h1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/handovers/h1')
    expect(result.current.data).toEqual(mockHandover)
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({})

    const { result } = renderHook(() => useHandoverById(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => !result.current.isLoading)

    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateHandover', () => {
  it('calls POST /handovers and invalidates query', async () => {
    const mockHandover = { id: 'h2', contract_id: 'c1' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockHandover)

    const { result } = renderHook(() => useCreateHandover(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      contractId: 'c1',
      handoverDate: '2026-03-15',
      handoverType: 'INITIAL',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/handovers', {
      contractId: 'c1',
      handoverDate: '2026-03-15',
      handoverType: 'INITIAL',
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateHandover(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ contractId: '', handoverDate: '', handoverType: 'INITIAL' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateHandover', () => {
  it('calls PUT /handovers/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ id: 'h1', status: 'COMPLETED' })

    const { result } = renderHook(() => useUpdateHandover(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'h1', data: { status: 'COMPLETED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/handovers/h1', { status: 'COMPLETED' })
  })
})

describe('useDeleteHandover', () => {
  it('calls DELETE /handovers/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteHandover(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('h1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/handovers/h1')
  })
})
