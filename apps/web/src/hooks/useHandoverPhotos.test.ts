import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useHandoverPhotos,
  useHandoverPhotosById,
  useCreateHandoverPhotos,
  useUpdateHandoverPhotos,
  useDeleteHandoverPhotos,
} from './useHandoverPhotos'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useHandoverPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches handover photos with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', handover_id: 'h1', photos: [] }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/handover-photos')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with handoverId', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useHandoverPhotos({ handoverId: 'h1', page: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('handoverId=h1'),
    )
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useHandoverPhotosById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches handover photos by id', async () => {
    const mockPhotos = { id: 'p1', handover_id: 'h1', photos: [] }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockPhotos)

    const { result } = renderHook(() => useHandoverPhotosById('p1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/handover-photos/p1')
    expect(result.current.data).toEqual(mockPhotos)
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({})

    const { result } = renderHook(() => useHandoverPhotosById(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => !result.current.isLoading)

    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateHandoverPhotos', () => {
  it('calls POST /handover-photos and invalidates query', async () => {
    const mockPhotos = { id: 'p2', handover_id: 'h1' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockPhotos)

    const { result } = renderHook(() => useCreateHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ handoverId: 'h1', photos: [], description: 'test' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/handover-photos', {
      handoverId: 'h1',
      photos: [],
      description: 'test',
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ handoverId: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateHandoverPhotos', () => {
  it('calls PUT /handover-photos/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ id: 'p1', description: 'updated' })

    const { result } = renderHook(() => useUpdateHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'p1', data: { description: 'updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/handover-photos/p1', {
      description: 'updated',
    })
  })
})

describe('useDeleteHandoverPhotos', () => {
  it('calls DELETE /handover-photos/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteHandoverPhotos(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('p1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/handover-photos/p1')
  })
})
