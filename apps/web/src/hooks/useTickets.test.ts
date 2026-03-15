import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useTickets, useCreateTicket, useUpdateTicket, useDeleteTicket } from './useTickets'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches tickets with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', title: 'Broken AC unit', status: 'OPEN', priority: 'HIGH' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useTickets(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/tickets')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useTickets({ status: 'OPEN', priority: 'HIGH', page: 2 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(expect.stringContaining('status=OPEN'))
    expect(apiClient.apiGet).toHaveBeenCalledWith(expect.stringContaining('priority=HIGH'))
    expect(apiClient.apiGet).toHaveBeenCalledWith(expect.stringContaining('page=2'))
  })

  it('excludes "all" filter values from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useTickets({ status: 'all', priority: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
    expect(call).not.toContain('priority=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTickets(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreateTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /tickets and invalidates query', async () => {
    const mockTicket = { id: '2', title: 'Leaking pipe', status: 'OPEN', priority: 'URGENT' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockTicket)

    const { result } = renderHook(() => useCreateTicket(), { wrapper: createWrapper() })

    result.current.mutate({ title: 'Leaking pipe', priority: 'URGENT' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/tickets', {
      title: 'Leaking pipe',
      priority: 'URGENT',
    })
    expect(result.current.data).toEqual(mockTicket)
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateTicket(), { wrapper: createWrapper() })

    result.current.mutate({ title: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /tickets/:id', async () => {
    const mockTicket = { id: '1', title: 'Updated ticket', status: 'RESOLVED' }
    vi.mocked(apiClient.apiPut).mockResolvedValue(mockTicket)

    const { result } = renderHook(() => useUpdateTicket(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: { status: 'RESOLVED' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/tickets/1', { status: 'RESOLVED' })
  })
})

describe('useDeleteTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /tickets/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteTicket(), { wrapper: createWrapper() })

    result.current.mutate('ticket-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/tickets/ticket-1')
  })
})
