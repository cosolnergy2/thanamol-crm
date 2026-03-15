import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useDeposits,
  useDepositById,
  useCreateDeposit,
  useUpdateDeposit,
  useDeleteDeposit,
} from './useDeposits'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDeposits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches deposits with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', amount: 5000, status: 'HELD' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useDeposits(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/deposits')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useDeposits({ page: 1, status: 'HELD' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=HELD'),
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useDeposits({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('builds query string with contractId and customerId', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useDeposits({ contractId: 'contract-1', customerId: 'cust-1' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).toContain('contractId=contract-1')
    expect(call).toContain('customerId=cust-1')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDeposits(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useDepositById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches deposit by id', async () => {
    const mockDeposit = { deposit: { id: 'abc', amount: 5000, status: 'HELD' } }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockDeposit)

    const { result } = renderHook(() => useDepositById('abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/deposits/abc')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useDepositById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateDeposit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /deposits and invalidates queries', async () => {
    const mockDeposit = { deposit: { id: '1', amount: 5000, status: 'HELD' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockDeposit)

    const { result } = renderHook(() => useCreateDeposit(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      contractId: 'contract-1',
      customerId: 'cust-1',
      amount: 5000,
      depositDate: '2025-01-01',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith(
      '/deposits',
      expect.objectContaining({
        contractId: 'contract-1',
        amount: 5000,
      }),
    )
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateDeposit(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      contractId: '',
      customerId: '',
      amount: 0,
      depositDate: '',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateDeposit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /deposits/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ deposit: { id: 'abc', status: 'REFUNDED' } })

    const { result } = renderHook(() => useUpdateDeposit(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'abc', data: { status: 'REFUNDED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/deposits/abc', { status: 'REFUNDED' })
  })
})

describe('useDeleteDeposit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /deposits/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteDeposit(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('deposit-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/deposits/deposit-1')
  })
})
