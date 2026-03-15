import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from './useCompanies'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches companies with no params', async () => {
    const mockResponse = {
      data: [{ id: 'co1', name: 'Buildco Ltd' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/companies')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('appends search param when provided', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useCompanies({ search: 'build' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('search=build'),
    )
  })

  it('excludes "all" from industry and status params', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useCompanies({ industry: 'all', status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('industry=all')
    expect(call).not.toContain('status=all')
  })

  it('returns error state on API failure', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateCompany', () => {
  it('posts to /companies', async () => {
    const mockCompany = { id: 'co2', name: 'New Corp' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockCompany)

    const { result } = renderHook(() => useCreateCompany(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'New Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/companies', { name: 'New Corp' })
    expect(result.current.data).toEqual(mockCompany)
  })

  it('surfaces error on mutation failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Company name taken'))

    const { result } = renderHook(() => useCreateCompany(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Company name taken')
  })
})

describe('useUpdateCompany', () => {
  it('calls PUT /companies/:id', async () => {
    const updated = { id: 'co1', name: 'Updated Corp' }
    vi.mocked(apiClient.apiPut).mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdateCompany(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'co1', data: { name: 'Updated Corp' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/companies/co1', {
      name: 'Updated Corp',
    })
  })
})

describe('useDeleteCompany', () => {
  it('calls DELETE /companies/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteCompany(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('co1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/companies/co1')
  })
})
