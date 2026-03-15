import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useLeaseAgreements,
  useLeaseAgreementById,
  useCreateLeaseAgreement,
  useUpdateLeaseAgreement,
  useDeleteLeaseAgreement,
} from './useLeaseAgreements'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLeaseAgreements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches lease agreements with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', contract_id: 'ct-1', status: 'DRAFT' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useLeaseAgreements(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/lease-agreements')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with contractId and status filters', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useLeaseAgreements({ contractId: 'ct-1', status: 'ACTIVE' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('contractId=ct-1'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=ACTIVE'),
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useLeaseAgreements({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useLeaseAgreements(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useLeaseAgreementById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches lease agreement by id', async () => {
    const mockAgreement = {
      leaseAgreement: { id: 'abc', contract_id: 'ct-1', status: 'DRAFT' },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockAgreement)

    const { result } = renderHook(() => useLeaseAgreementById('abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/lease-agreements/abc')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useLeaseAgreementById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateLeaseAgreement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /lease-agreements and invalidates queries', async () => {
    const mockResponse = { leaseAgreement: { id: '1', contract_id: 'ct-1', status: 'DRAFT' } }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateLeaseAgreement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ contractId: 'ct-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith(
      '/lease-agreements',
      expect.objectContaining({ contractId: 'ct-1' }),
    )
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateLeaseAgreement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ contractId: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateLeaseAgreement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /lease-agreements/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ leaseAgreement: { id: 'abc' } })

    const { result } = renderHook(() => useUpdateLeaseAgreement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'abc', data: { status: 'ACTIVE' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/lease-agreements/abc', { status: 'ACTIVE' })
  })
})

describe('useDeleteLeaseAgreement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /lease-agreements/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteLeaseAgreement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('agreement-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/lease-agreements/agreement-1')
  })

  it('surfaces error on deletion failure', async () => {
    vi.mocked(apiClient.apiDelete).mockRejectedValue(new Error('Cannot delete active agreement'))

    const { result } = renderHook(() => useDeleteLeaseAgreement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('agreement-1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Cannot delete active agreement')
  })
})
