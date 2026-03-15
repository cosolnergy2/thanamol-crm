import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useActivityLogs, useAuditLogs } from './useActivityLogs'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useActivityLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches activity logs with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', action: 'CREATE', entity_type: 'Customer' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useActivityLogs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/activity-logs')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with action filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useActivityLogs({ page: 1, limit: 10, action: 'CREATE' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('action=CREATE'),
    )
  })

  it('builds query string with userId filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useActivityLogs({ userId: 'user-1' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('userId=user-1'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Forbidden'))

    const { result } = renderHook(() => useActivityLogs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches audit logs with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', action: 'LOGIN', user_id: 'u1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/audit-logs')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with action and userId', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useAuditLogs({ action: 'LOGIN', userId: 'user-2' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('action=LOGIN'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('userId=user-2'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Forbidden'))

    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
