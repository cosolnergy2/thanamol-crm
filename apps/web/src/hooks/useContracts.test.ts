import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useContracts,
  useContractById,
  usePendingContracts,
  useExpiringContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useApproveContract,
  useRejectContract,
} from './useContracts'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches contracts with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', contract_number: 'CT-202501-0001' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useContracts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/contracts')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status and type filters', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useContracts({ page: 1, status: 'ACTIVE', type: 'RENTAL' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=ACTIVE'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('type=RENTAL'),
    )
  })

  it('excludes "all" filter values from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useContracts({ status: 'all', type: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
    expect(call).not.toContain('type=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useContracts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useContractById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches contract by id', async () => {
    const mockContract = { contract: { id: 'abc', contract_number: 'CT-202501-0001' } }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockContract)

    const { result } = renderHook(() => useContractById('abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/contracts/abc')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useContractById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('usePendingContracts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches pending contracts', async () => {
    const mockResponse = { data: [{ id: '1', status: 'PENDING_APPROVAL' }] }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => usePendingContracts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/contracts/pending')
  })
})

describe('useExpiringContracts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches expiring contracts with default 30 days', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useExpiringContracts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/contracts/expiring?days=30')
  })

  it('uses custom days parameter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useExpiringContracts(60), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/contracts/expiring?days=60')
  })
})

describe('useCreateContract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /contracts and invalidates queries', async () => {
    const mockContract = { contract: { id: '1', contract_number: 'CT-202501-0001' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockContract)

    const { result } = renderHook(() => useCreateContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      customerId: 'cust-1',
      projectId: 'proj-1',
      type: 'RENTAL',
      startDate: '2025-01-01',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith('/contracts', expect.objectContaining({
      customerId: 'cust-1',
      type: 'RENTAL',
    }))
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: '', projectId: '', type: 'RENTAL', startDate: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateContract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /contracts/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ contract: { id: 'abc' } })

    const { result } = renderHook(() => useUpdateContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'abc', data: { terms: 'new terms' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/contracts/abc', { terms: 'new terms' })
  })
})

describe('useDeleteContract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /contracts/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('contract-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/contracts/contract-1')
  })
})

describe('useApproveContract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /contracts/:id/approve', async () => {
    vi.mocked(apiClient.apiPost).mockResolvedValue({ contract: { id: 'abc', status: 'APPROVED' } })

    const { result } = renderHook(() => useApproveContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('abc')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith('/contracts/abc/approve', {})
  })

  it('surfaces error when approval fails', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Not authorized'))

    const { result } = renderHook(() => useApproveContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('abc')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Not authorized')
  })
})

describe('useRejectContract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /contracts/:id/reject with reason', async () => {
    vi.mocked(apiClient.apiPost).mockResolvedValue({ contract: { id: 'abc', status: 'DRAFT' } })

    const { result } = renderHook(() => useRejectContract(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'abc', data: { reason: 'Missing documents' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith('/contracts/abc/reject', {
      reason: 'Missing documents',
    })
  })
})
