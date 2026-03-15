import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useInvoices,
  useInvoiceById,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from './useInvoices'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches invoices with no params', async () => {
    const mockResponse = {
      data: [{ id: '1', invoice_number: 'INV-202501-0001', status: 'DRAFT', total: 10000 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/invoices')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with status filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useInvoices({ page: 1, status: 'OVERDUE' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('status=OVERDUE'),
    )
  })

  it('excludes "all" status from query string', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useInvoices({ status: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    const call = vi.mocked(apiClient.apiGet).mock.calls[0][0] as string
    expect(call).not.toContain('status=all')
  })

  it('builds query string with customerId filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => useInvoices({ customerId: 'cust-123' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('customerId=cust-123'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useInvoiceById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches invoice by id', async () => {
    const mockInvoice = {
      invoice: {
        id: 'inv-abc',
        invoice_number: 'INV-202501-0001',
        status: 'SENT',
        total: 10000,
      },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockInvoice)

    const { result } = renderHook(() => useInvoiceById('inv-abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/invoices/inv-abc')
    expect(result.current.data).toEqual(mockInvoice)
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useInvoiceById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /invoices and invalidates queries', async () => {
    const mockResponse = {
      invoice: { id: 'new-inv', invoice_number: 'INV-202501-0002', status: 'DRAFT' },
    }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: 'cust-1', items: [], subtotal: 0, tax: 0, total: 0 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith(
      '/invoices',
      expect.objectContaining({ customerId: 'cust-1' }),
    )
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Customer not found'))

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ customerId: 'bad-id' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Customer not found')
  })
})

describe('useUpdateInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /invoices/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ invoice: { id: 'inv-1', status: 'SENT' } })

    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'inv-1', data: { status: 'SENT' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/invoices/inv-1', { status: 'SENT' })
  })

  it('surfaces error when update fails', async () => {
    vi.mocked(apiClient.apiPut).mockRejectedValue(new Error('Invoice not found'))

    const { result } = renderHook(() => useUpdateInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'bad-id', data: { status: 'SENT' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Invoice not found')
  })
})

describe('useDeleteInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /invoices/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('inv-to-delete')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/invoices/inv-to-delete')
  })

  it('surfaces error when only non-DRAFT invoices are attempted', async () => {
    vi.mocked(apiClient.apiDelete).mockRejectedValue(
      new Error('Only DRAFT invoices can be deleted'),
    )

    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('sent-invoice-id')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Only DRAFT invoices can be deleted')
  })
})
