import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useISODocuments, useCreateISODocument, useDeleteISODocument, ISO_DOCUMENT_QUERY_KEYS } from './useISODocuments'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiGet, apiPost, apiDelete } from '@/lib/api-client'

const mockISOList = {
  data: [
    {
      id: 'iso-1',
      document_number: 'DCN-TEST-ADM-PR-2026-001',
      title: 'Test Procedure',
      category: 'Procedure',
      revision: '00',
      status: 'DRAFT',
      content: null,
      effective_date: null,
      review_date: null,
      approved_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useISODocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches ISO documents list', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockISOList)

    const { result } = renderHook(() => useISODocuments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].document_number).toBe('DCN-TEST-ADM-PR-2026-001')
  })

  it('builds query key with params', () => {
    const params = { status: 'DRAFT' as const }
    const key = ISO_DOCUMENT_QUERY_KEYS.list(params)
    expect(key).toEqual(['iso-documents', 'list', params])
  })

  it('filters by status without including "all" value', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockISOList)

    const { result } = renderHook(() => useISODocuments({ status: 'all' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // 'all' should not be passed as query param
    expect(apiGet).toHaveBeenCalledWith(expect.not.stringContaining('status=all'))
  })

  it('handles fetch error', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useISODocuments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateISODocument', () => {
  it('calls apiPost with ISO document data', async () => {
    vi.mocked(apiPost).mockResolvedValue({ isoDocument: mockISOList.data[0] })

    const { result } = renderHook(() => useCreateISODocument(), { wrapper: createWrapper() })

    result.current.mutate({
      documentNumber: 'DCN-TEST-ADM-PR-2026-001',
      title: 'Test Procedure',
      category: 'Procedure',
      revision: '00',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiPost).toHaveBeenCalledWith('/iso-documents', expect.objectContaining({
      documentNumber: 'DCN-TEST-ADM-PR-2026-001',
      title: 'Test Procedure',
    }))
  })
})

describe('useDeleteISODocument', () => {
  it('calls apiDelete with ISO document id', async () => {
    vi.mocked(apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteISODocument(), { wrapper: createWrapper() })

    result.current.mutate('iso-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiDelete).toHaveBeenCalledWith('/iso-documents/iso-1')
  })
})
