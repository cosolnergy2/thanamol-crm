import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCustomers, useCreateCustomer, useDeleteCustomer } from './useCustomers'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches customers with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', name: 'ACME Corp' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCustomers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/customers')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with search and status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useCustomers({ page: 2, search: 'john', status: 'ACTIVE' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('search=john'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=ACTIVE'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
    )
  })

  it('excludes "all" filter value from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useCustomers({ type: 'all', status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('type=all')
    expect(call).not.toContain('status=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCustomers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreateCustomer', () => {
  it('calls POST /customers and invalidates query', async () => {
    const mockCustomer = { id: '2', name: 'New Customer' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockCustomer)

    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'New Customer', type: 'INDIVIDUAL', status: 'PROSPECT' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/customers', {
      name: 'New Customer',
      type: 'INDIVIDUAL',
      status: 'PROSPECT',
    })
    expect(result.current.data).toEqual(mockCustomer)
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useDeleteCustomer', () => {
  it('calls DELETE /customers/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteCustomer(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('customer-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/customers/customer-1')
  })
})
