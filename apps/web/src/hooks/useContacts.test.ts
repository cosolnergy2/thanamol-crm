import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useContacts, useCreateContact } from './useContacts'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches contacts with no params', async () => {
    const mockResponse = {
      data: [{ id: 'c1', first_name: 'John', last_name: 'Doe' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useContacts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/contacts')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('filters by customerId', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useContacts({ customerId: 'cust-123' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('customerId=cust-123'),
    )
  })

  it('excludes "all" from customerId filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useContacts({ customerId: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('customerId=all')
  })

  it('returns error state on API failure', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useContacts(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateContact', () => {
  it('posts to /contacts', async () => {
    const mockContact = { id: 'c2', first_name: 'Jane', last_name: 'Smith' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockContact)

    const { result } = renderHook(() => useCreateContact(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      customerId: 'cust-1',
      firstName: 'Jane',
      lastName: 'Smith',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/contacts', {
      customerId: 'cust-1',
      firstName: 'Jane',
      lastName: 'Smith',
    })
  })

  it('surfaces error on mutation failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Bad request'))

    const { result } = renderHook(() => useCreateContact(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: '', firstName: '', lastName: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Bad request')
  })
})
