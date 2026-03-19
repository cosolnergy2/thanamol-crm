import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useDocuments, useCreateDocument, useDeleteDocument, DOCUMENT_QUERY_KEYS } from './useDocuments'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiGet, apiPost, apiDelete } from '@/lib/api-client'

const mockDocumentList = {
  data: [
    {
      id: 'doc-1',
      title: 'Test Document',
      file_url: 'https://example.com/test.pdf',
      file_type: 'application/pdf',
      file_size: 12345,
      category: 'Contract',
      entity_type: null,
      entity_id: null,
      uploaded_by: 'user-1',
      tags: ['test'],
      version: 1,
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

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches documents list', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockDocumentList)

    const { result } = renderHook(() => useDocuments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].title).toBe('Test Document')
  })

  it('builds query key with params', () => {
    const params = { category: 'Contract', page: 1 }
    const key = DOCUMENT_QUERY_KEYS.list(params)
    expect(key).toEqual(['documents', 'list', params])
  })

  it('passes category filter in query string', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockDocumentList)

    const { result } = renderHook(() => useDocuments({ category: 'Contract' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('category=Contract'))
  })

  it('handles fetch error gracefully', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDocuments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateDocument', () => {
  it('calls apiPost with correct endpoint and data', async () => {
    vi.mocked(apiPost).mockResolvedValue({ document: mockDocumentList.data[0] })

    const { result } = renderHook(() => useCreateDocument(), { wrapper: createWrapper() })

    result.current.mutate({
      title: 'New Document',
      fileUrl: 'https://example.com/new.pdf',
      category: 'Contract',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiPost).toHaveBeenCalledWith('/documents', expect.objectContaining({
      title: 'New Document',
      fileUrl: 'https://example.com/new.pdf',
    }))
  })
})

describe('useDeleteDocument', () => {
  it('calls apiDelete with document id', async () => {
    vi.mocked(apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteDocument(), { wrapper: createWrapper() })

    result.current.mutate('doc-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiDelete).toHaveBeenCalledWith('/documents/doc-1')
  })
})
