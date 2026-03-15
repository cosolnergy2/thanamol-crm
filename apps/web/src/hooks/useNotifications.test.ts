import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from './useNotifications'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches notifications with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', title: 'Test', message: 'Hello', is_read: false }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/notifications')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with isRead=false', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useNotifications({ page: 1, limit: 10, isRead: false }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('isRead=false'),
    )
  })

  it('builds query string with isRead=true', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useNotifications({ isRead: true }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('isRead=true'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useMarkAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /notifications/:id/read', async () => {
    const mockNotif = { id: '1', is_read: true }
    vi.mocked(apiClient.apiPut).mockResolvedValue(mockNotif)

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/notifications/1/read')
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPut).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('bad-id')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Not found')
  })
})

describe('useMarkAllAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /notifications/read-all', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ message: 'All marked as read' })

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/notifications/read-all')
  })
})
