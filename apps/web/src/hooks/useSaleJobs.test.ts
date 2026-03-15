import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useSaleJobs,
  useSaleJob,
  useCreateSaleJob,
  useUpdateSaleJob,
  useDeleteSaleJob,
  useApproveSaleJob,
  useRejectSaleJob,
} from './useSaleJobs'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useSaleJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches sale jobs with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', form_number: 'SJ-001', status: 'DRAFT' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useSaleJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/sale-jobs')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useSaleJobs({ status: 'APPROVED' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=APPROVED'),
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useSaleJobs({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('returns error when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useSaleJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useSaleJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single sale job by id', async () => {
    const mockJob = { id: 'job-1', form_number: 'SJ-001', status: 'DRAFT' }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockJob)

    const { result } = renderHook(() => useSaleJob('job-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/sale-jobs/job-1')
  })

  it('does not fetch when id is empty', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({})

    const { result } = renderHook(() => useSaleJob(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateSaleJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /sale-jobs', async () => {
    const mockJob = { id: 'new-job', form_number: 'SJ-002', status: 'DRAFT' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockJob)

    const { result } = renderHook(() => useCreateSaleJob(), { wrapper: createWrapper() })

    result.current.mutate({ projectId: 'p1', customerId: 'c1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/sale-jobs', {
      projectId: 'p1',
      customerId: 'c1',
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateSaleJob(), { wrapper: createWrapper() })

    result.current.mutate({ projectId: '', customerId: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useDeleteSaleJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /sale-jobs/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ message: 'deleted' })

    const { result } = renderHook(() => useDeleteSaleJob(), { wrapper: createWrapper() })

    result.current.mutate('job-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/sale-jobs/job-1')
  })
})

describe('useApproveSaleJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /sale-jobs/:id/approve', async () => {
    const mockJob = { id: 'job-1', status: 'APPROVED' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockJob)

    const { result } = renderHook(() => useApproveSaleJob(), { wrapper: createWrapper() })

    result.current.mutate('job-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/sale-jobs/job-1/approve')
  })
})

describe('useRejectSaleJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /sale-jobs/:id/reject with reason', async () => {
    const mockJob = { id: 'job-1', status: 'REJECTED' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockJob)

    const { result } = renderHook(() => useRejectSaleJob(), { wrapper: createWrapper() })

    result.current.mutate({ id: 'job-1', reason: 'Not compliant' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/sale-jobs/job-1/reject', {
      reason: 'Not compliant',
    })
  })
})
