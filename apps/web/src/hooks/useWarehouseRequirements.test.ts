import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useWarehouseRequirements,
  useWarehouseRequirement,
  useCreateWarehouseRequirement,
  useUpdateWarehouseRequirement,
  useDeleteWarehouseRequirement,
} from './useWarehouseRequirements'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useWarehouseRequirements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches requirements with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', status: 'DRAFT', customer_id: 'c1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useWarehouseRequirements(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/warehouse-requirements')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useWarehouseRequirements({ status: 'APPROVED' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=APPROVED'),
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useWarehouseRequirements({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('returns error when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useWarehouseRequirements(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useWarehouseRequirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single requirement by id', async () => {
    const mockReq = { id: 'req-1', status: 'DRAFT' }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockReq)

    const { result } = renderHook(() => useWarehouseRequirement('req-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/warehouse-requirements/req-1')
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({})

    const { result } = renderHook(() => useWarehouseRequirement(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateWarehouseRequirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /warehouse-requirements', async () => {
    const mockReq = { id: 'new-req', status: 'DRAFT' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockReq)

    const { result } = renderHook(() => useCreateWarehouseRequirement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: 'c1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/warehouse-requirements', {
      customerId: 'c1',
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateWarehouseRequirement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useDeleteWarehouseRequirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /warehouse-requirements/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteWarehouseRequirement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('req-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/warehouse-requirements/req-1')
  })
})

describe('useUpdateWarehouseRequirement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /warehouse-requirements/:id', async () => {
    const mockReq = { id: 'req-1', status: 'APPROVED' }
    vi.mocked(apiClient.apiPut).mockResolvedValue(mockReq)

    const { result } = renderHook(() => useUpdateWarehouseRequirement(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'req-1', data: { status: 'APPROVED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/warehouse-requirements/req-1', {
      status: 'APPROVED',
    })
  })
})
