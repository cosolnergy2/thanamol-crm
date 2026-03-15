import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
const mockApiDelete = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
}))

import {
  useUnits,
  useUnit,
  useUnitAvailability,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from './useUnits'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const mockUnit = {
  id: 'unit-1',
  project_id: 'proj-1',
  unit_number: 'A-101',
  floor: 1,
  building: 'Building A',
  type: 'Warehouse',
  area_sqm: 200,
  price: 50000,
  status: 'AVAILABLE' as const,
  features: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  project: { id: 'proj-1', name: 'Project Alpha', code: 'PA-001' },
}

const mockPaginatedResponse = {
  data: [mockUnit],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useUnits', () => {
  it('fetches unit list and returns data', async () => {
    mockApiGet.mockResolvedValue(mockPaginatedResponse)

    const { result } = renderHook(() => useUnits(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].unit_number).toBe('A-101')
    expect(mockApiGet).toHaveBeenCalledWith('/units')
  })

  it('builds query string from filters', async () => {
    mockApiGet.mockResolvedValue(mockPaginatedResponse)

    renderHook(
      () => useUnits({ projectId: 'proj-1', status: 'AVAILABLE', type: 'Warehouse', page: 2 }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled())

    const calledPath: string = mockApiGet.mock.calls[0][0]
    expect(calledPath).toContain('projectId=proj-1')
    expect(calledPath).toContain('status=AVAILABLE')
    expect(calledPath).toContain('type=Warehouse')
    expect(calledPath).toContain('page=2')
  })

  it('returns isError on fetch failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUnits(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
  })
})

describe('useUnit', () => {
  it('fetches a single unit by id', async () => {
    mockApiGet.mockResolvedValue({ unit: mockUnit })

    const { result } = renderHook(() => useUnit('unit-1'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.unit.unit_number).toBe('A-101')
    expect(mockApiGet).toHaveBeenCalledWith('/units/unit-1')
  })

  it('does not fetch when id is empty', () => {
    renderHook(() => useUnit(''), { wrapper: makeWrapper() })
    expect(mockApiGet).not.toHaveBeenCalled()
  })
})

describe('useUnitAvailability', () => {
  it('fetches availability without projectId filter', async () => {
    mockApiGet.mockResolvedValue({ availability: [] })

    const { result } = renderHook(() => useUnitAvailability(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockApiGet).toHaveBeenCalledWith('/units/availability')
  })

  it('fetches availability with projectId filter', async () => {
    mockApiGet.mockResolvedValue({ availability: [] })

    renderHook(() => useUnitAvailability('proj-1'), { wrapper: makeWrapper() })

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled())

    expect(mockApiGet).toHaveBeenCalledWith('/units/availability?projectId=proj-1')
  })
})

describe('useCreateUnit', () => {
  it('calls POST /units with body and invalidates queries', async () => {
    mockApiPost.mockResolvedValue({ unit: mockUnit })

    const { result } = renderHook(() => useCreateUnit(), { wrapper: makeWrapper() })

    result.current.mutate({
      projectId: 'proj-1',
      unitNumber: 'A-101',
      type: 'Warehouse',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApiPost).toHaveBeenCalledWith('/units', {
      projectId: 'proj-1',
      unitNumber: 'A-101',
      type: 'Warehouse',
    })
  })

  it('surfaces error when POST fails', async () => {
    mockApiPost.mockRejectedValue(new Error('Conflict'))

    const { result } = renderHook(() => useCreateUnit(), { wrapper: makeWrapper() })

    result.current.mutate({ projectId: 'proj-1', unitNumber: 'A-101', type: 'Warehouse' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpdateUnit', () => {
  it('calls PUT /units/:id and returns updated unit', async () => {
    const updated = { ...mockUnit, price: 60000 }
    mockApiPut.mockResolvedValue({ unit: updated })

    const { result } = renderHook(() => useUpdateUnit(), { wrapper: makeWrapper() })

    result.current.mutate({ id: 'unit-1', data: { price: 60000 } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApiPut).toHaveBeenCalledWith('/units/unit-1', { price: 60000 })
  })
})

describe('useDeleteUnit', () => {
  it('calls DELETE /units/:id', async () => {
    mockApiDelete.mockResolvedValue({ unit: mockUnit })

    const { result } = renderHook(() => useDeleteUnit(), { wrapper: makeWrapper() })

    result.current.mutate('unit-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApiDelete).toHaveBeenCalledWith('/units/unit-1')
  })
})
