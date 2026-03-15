import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useMeterRecords,
  useMeterRecordById,
  useCreateMeterRecord,
  useUpdateMeterRecord,
  useDeleteMeterRecord,
} from './useMeterRecords'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMeterRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches meter records with no params', async () => {
    const mockResponse = {
      data: [
        {
          id: 'mr-1',
          unit_id: 'unit-1',
          meter_type: 'ELECTRICITY',
          previous_reading: 100,
          current_reading: 150,
          usage: 50,
          amount: 500,
          billing_period: '2025-01',
          reading_date: '2025-01-31',
          created_at: '2025-01-31T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useMeterRecords(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/meter-records')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with unitId filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useMeterRecords({ unitId: 'unit-123' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('unitId=unit-123'),
    )
  })

  it('builds query string with meterType filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useMeterRecords({ meterType: 'WATER' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('meterType=WATER'),
    )
  })

  it('builds query string with billingPeriod filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useMeterRecords({ billingPeriod: '2025-01' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('billingPeriod=2025-01'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useMeterRecords(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useMeterRecordById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches meter record by id', async () => {
    const mockMeterRecord = {
      meterRecord: {
        id: 'mr-abc',
        unit_id: 'unit-1',
        meter_type: 'ELECTRICITY',
        previous_reading: 100,
        current_reading: 150,
        usage: 50,
        amount: 500,
        billing_period: '2025-01',
        reading_date: '2025-01-31',
        created_at: '2025-01-31T00:00:00Z',
        unit: {
          id: 'unit-1',
          unit_number: 'A101',
          floor: 1,
          building: 'A',
          project_id: 'proj-1',
        },
      },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockMeterRecord)

    const { result } = renderHook(() => useMeterRecordById('mr-abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/meter-records/mr-abc')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useMeterRecordById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateMeterRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /meter-records and invalidates queries', async () => {
    const mockResponse = {
      meterRecord: {
        id: 'new-mr',
        unit_id: 'unit-1',
        meter_type: 'ELECTRICITY',
        usage: 50,
      },
    }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateMeterRecord(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      unitId: 'unit-1',
      meterType: 'ELECTRICITY',
      previousReading: 100,
      currentReading: 150,
      readingDate: '2025-01-31',
      amount: 500,
      billingPeriod: '2025-01',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith(
      '/meter-records',
      expect.objectContaining({
        unitId: 'unit-1',
        meterType: 'ELECTRICITY',
        previousReading: 100,
        currentReading: 150,
      }),
    )
  })

  it('surfaces error when unit not found', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Unit not found'))

    const { result } = renderHook(() => useCreateMeterRecord(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      unitId: 'bad-unit',
      meterType: 'WATER',
      previousReading: 0,
      currentReading: 10,
      readingDate: '2025-01-01',
      amount: 100,
      billingPeriod: '2025-01',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Unit not found')
  })
})

describe('useUpdateMeterRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /meter-records/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({
      meterRecord: { id: 'mr-1', current_reading: 200 },
    })

    const { result } = renderHook(() => useUpdateMeterRecord(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'mr-1', data: { currentReading: 200 } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/meter-records/mr-1', { currentReading: 200 })
  })
})

describe('useDeleteMeterRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /meter-records/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteMeterRecord(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('mr-to-delete')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/meter-records/mr-to-delete')
  })

  it('surfaces error when meter record not found', async () => {
    vi.mocked(apiClient.apiDelete).mockRejectedValue(new Error('Meter record not found'))

    const { result } = renderHook(() => useDeleteMeterRecord(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('bad-id')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Meter record not found')
  })
})
