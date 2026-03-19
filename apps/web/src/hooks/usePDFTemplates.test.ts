import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePDFTemplates, useCreatePDFTemplate, useDeletePDFTemplate, PDF_TEMPLATE_QUERY_KEYS } from './usePDFTemplates'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiGet, apiPost, apiDelete } from '@/lib/api-client'

const mockTemplateList = {
  data: [
    {
      id: 'tpl-1',
      name: 'Standard Quotation',
      template_type: 'quotation',
      header: {},
      footer: {},
      styles: {},
      is_default: false,
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

describe('usePDFTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches PDF templates list', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockTemplateList)

    const { result } = renderHook(() => usePDFTemplates(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].name).toBe('Standard Quotation')
  })

  it('builds query key with params', () => {
    const params = { type: 'quotation' as const }
    const key = PDF_TEMPLATE_QUERY_KEYS.list(params)
    expect(key).toEqual(['pdf-templates', 'list', params])
  })

  it('filters by type', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockTemplateList)

    const { result } = renderHook(() => usePDFTemplates({ type: 'quotation' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('type=quotation'))
  })

  it('does not pass "all" as type filter', async () => {
    vi.mocked(apiGet).mockResolvedValue(mockTemplateList)

    const { result } = renderHook(() => usePDFTemplates({ type: 'all' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiGet).toHaveBeenCalledWith(expect.not.stringContaining('type=all'))
  })

  it('handles fetch error', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => usePDFTemplates(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreatePDFTemplate', () => {
  it('calls apiPost with PDF template data', async () => {
    vi.mocked(apiPost).mockResolvedValue({ template: mockTemplateList.data[0] })

    const { result } = renderHook(() => useCreatePDFTemplate(), { wrapper: createWrapper() })

    result.current.mutate({
      name: 'Standard Quotation',
      templateType: 'quotation',
      isDefault: false,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiPost).toHaveBeenCalledWith('/pdf-templates', expect.objectContaining({
      name: 'Standard Quotation',
      templateType: 'quotation',
    }))
  })
})

describe('useDeletePDFTemplate', () => {
  it('calls apiDelete with template id', async () => {
    vi.mocked(apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeletePDFTemplate(), { wrapper: createWrapper() })

    result.current.mutate('tpl-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiDelete).toHaveBeenCalledWith('/pdf-templates/tpl-1')
  })
})
