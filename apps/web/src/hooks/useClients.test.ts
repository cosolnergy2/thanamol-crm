import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useClientUpdateRequests,
  useUpdateClientRequest,
} from './useClients'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useClients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches clients with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', email: 'client@test.com', first_name: 'John', last_name: 'Doe' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/clients')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with search param', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(() => useClients({ page: 1, search: 'alice' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(expect.stringContaining('search=alice'))
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useClients(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /clients and invalidates cache', async () => {
    const mockClient = { id: '2', email: 'new@test.com', first_name: 'Jane', last_name: 'Smith' }
    vi.mocked(apiClient.apiPost).mockResolvedValue({ client: mockClient })

    const { result } = renderHook(() => useCreateClient(), { wrapper: createWrapper() })

    result.current.mutate({
      customerId: 'cust-1',
      email: 'new@test.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Smith',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/clients', expect.objectContaining({
      email: 'new@test.com',
      firstName: 'Jane',
    }))
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Email already in use'))

    const { result } = renderHook(() => useCreateClient(), { wrapper: createWrapper() })

    result.current.mutate({
      customerId: 'cust-1',
      email: 'dup@test.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Smith',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Email already in use')
  })
})

describe('useUpdateClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /clients/:id', async () => {
    const updated = { id: '1', email: 'updated@test.com' }
    vi.mocked(apiClient.apiPut).mockResolvedValue({ client: updated })

    const { result } = renderHook(() => useUpdateClient(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: { email: 'updated@test.com' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/clients/1', { email: 'updated@test.com' })
  })
})

describe('useDeleteClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /clients/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteClient(), { wrapper: createWrapper() })

    result.current.mutate('client-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/clients/client-1')
  })
})

describe('useClientUpdateRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches update requests with no params', async () => {
    const mockResponse = {
      data: [{ id: 'r1', status: 'PENDING', entity_type: 'Customer', entity_id: 'cust-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useClientUpdateRequests(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/client-update-requests')
  })

  it('filters by status', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useClientUpdateRequests({ status: 'APPROVED' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=APPROVED')
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useClientUpdateRequests({ status: 'all' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })
})

describe('useUpdateClientRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /client-update-requests/:id to approve', async () => {
    const updated = { id: 'r1', status: 'APPROVED' }
    vi.mocked(apiClient.apiPut).mockResolvedValue({ request: updated })

    const { result } = renderHook(() => useUpdateClientRequest(), { wrapper: createWrapper() })

    result.current.mutate({ id: 'r1', data: { status: 'APPROVED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/client-update-requests/r1', { status: 'APPROVED' })
  })

  it('calls PUT /client-update-requests/:id to reject', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ request: { id: 'r1', status: 'REJECTED' } })

    const { result } = renderHook(() => useUpdateClientRequest(), { wrapper: createWrapper() })

    result.current.mutate({ id: 'r1', data: { status: 'REJECTED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/client-update-requests/r1', { status: 'REJECTED' })
  })

  it('surfaces error on API failure', async () => {
    vi.mocked(apiClient.apiPut).mockRejectedValue(new Error('Request not found'))

    const { result } = renderHook(() => useUpdateClientRequest(), { wrapper: createWrapper() })

    result.current.mutate({ id: 'missing', data: { status: 'APPROVED' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Request not found')
  })
})
