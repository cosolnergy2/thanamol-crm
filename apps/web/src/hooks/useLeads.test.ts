import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useLeads, useLead, useCreateLead, useUpdateLead, useDeleteLead } from './useLeads'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches leads with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', title: 'Test Lead', status: 'NEW' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/leads')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with search and status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useLeads({ page: 2, search: 'test', status: 'NEW' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('search=test'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=NEW'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
    )
  })

  it('excludes "all" filter value from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useLeads({ status: 'all', source: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
    expect(call).not.toContain('source=all')
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useLeads(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches single lead by id', async () => {
    const mockLead = { id: 'lead-1', title: 'Test Lead', status: 'NEW' }
    vi.mocked(apiClient.apiGet).mockResolvedValue({ lead: mockLead })

    const { result } = renderHook(() => useLead('lead-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/leads/lead-1')
    expect(result.current.data).toEqual({ lead: mockLead })
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ lead: null })

    const { result } = renderHook(() => useLead(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /leads and invalidates query', async () => {
    const mockLead = { id: '2', title: 'New Lead' }
    vi.mocked(apiClient.apiPost).mockResolvedValue({ lead: mockLead })

    const { result } = renderHook(() => useCreateLead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ title: 'New Lead' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/leads', { title: 'New Lead' })
    expect(result.current.data).toEqual({ lead: mockLead })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateLead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ title: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /leads/:id', async () => {
    const mockLead = { id: 'lead-1', title: 'Updated Lead', status: 'CONTACTED' }
    vi.mocked(apiClient.apiPut).mockResolvedValue({ lead: mockLead })

    const { result } = renderHook(() => useUpdateLead('lead-1'), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ status: 'CONTACTED' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/leads/lead-1', { status: 'CONTACTED' })
  })
})

describe('useDeleteLead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /leads/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteLead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('lead-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/leads/lead-1')
  })
})
