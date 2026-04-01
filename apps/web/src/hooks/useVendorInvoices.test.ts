import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useVendorInvoices,
  useVendorInvoice,
  useCreateVendorInvoice,
  useSubmitVendorInvoice,
  useMarkVendorInvoicePaid,
  useDeleteVendorInvoice,
  VENDOR_INVOICE_QUERY_KEYS,
} from './useVendorInvoices'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiGet, apiPost, apiDelete } from '@/lib/api-client'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('VENDOR_INVOICE_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(VENDOR_INVOICE_QUERY_KEYS.all).toEqual(['vendor-invoices'])
  })

  it('returns list key with params', () => {
    expect(VENDOR_INVOICE_QUERY_KEYS.list({ page: 1 })).toEqual([
      'vendor-invoices',
      'list',
      { page: 1 },
    ])
  })

  it('returns detail key with id', () => {
    expect(VENDOR_INVOICE_QUERY_KEYS.detail('abc-123')).toEqual(['vendor-invoices', 'abc-123'])
  })
})

describe('useVendorInvoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches vendor invoices list', async () => {
    const mockData = {
      data: [{ id: '1', invoice_number: 'INV-001', total: 5000 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiGet).mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useVendorInvoices({ page: 1 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockData)
    expect(apiGet).toHaveBeenCalledWith('/fms/vendor-invoices?page=1')
  })

  it('fetches with vendor filter', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ data: [], pagination: {} })

    renderHook(() => useVendorInvoices({ vendorId: 'v-1', paymentStatus: 'PENDING' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    expect(apiGet).toHaveBeenCalledWith(
      '/fms/vendor-invoices?vendorId=v-1&paymentStatus=PENDING'
    )
  })
})

describe('useVendorInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches single invoice', async () => {
    const mockInvoice = { invoice: { id: '1', invoice_number: 'INV-001' } }
    vi.mocked(apiGet).mockResolvedValueOnce(mockInvoice)

    const { result } = renderHook(() => useVendorInvoice('1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockInvoice)
    expect(apiGet).toHaveBeenCalledWith('/fms/vendor-invoices/1')
  })

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useVendorInvoice(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreateVendorInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an invoice and invalidates queries', async () => {
    const newInvoice = { invoice: { id: '2', invoice_number: 'INV-002' } }
    vi.mocked(apiPost).mockResolvedValueOnce(newInvoice)

    const { result } = renderHook(() => useCreateVendorInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      invoiceNumber: 'INV-002',
      vendorId: 'v-1',
      items: [{ description: 'Item', quantity: 1, unit_price: 1000, total: 1000 }],
      subtotal: 1000,
      tax: 70,
      total: 1070,
      invoiceDate: '2024-01-01',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiPost).toHaveBeenCalledWith('/fms/vendor-invoices', expect.any(Object))
  })
})

describe('useSubmitVendorInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts submit event with notes', async () => {
    const response = { invoice: { id: '1', submission_history: [{ submittedAt: '2024-01-01' }] } }
    vi.mocked(apiPost).mockResolvedValueOnce(response)

    const { result } = renderHook(() => useSubmitVendorInvoice('1'), {
      wrapper: createWrapper(),
    })

    result.current.mutate('Submitted for approval')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiPost).toHaveBeenCalledWith('/fms/vendor-invoices/1/submit', {
      notes: 'Submitted for approval',
    })
  })

  it('posts submit without notes', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ invoice: { id: '1' } })

    const { result } = renderHook(() => useSubmitVendorInvoice('1'), {
      wrapper: createWrapper(),
    })

    result.current.mutate(undefined)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiPost).toHaveBeenCalledWith('/fms/vendor-invoices/1/submit', {
      notes: undefined,
    })
  })
})

describe('useMarkVendorInvoicePaid', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks invoice as paid', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ invoice: { id: '1', payment_status: 'PAID' } })

    const { result } = renderHook(() => useMarkVendorInvoicePaid('1'), {
      wrapper: createWrapper(),
    })

    result.current.mutate(undefined)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiPost).toHaveBeenCalledWith('/fms/vendor-invoices/1/mark-paid', {
      paymentDate: undefined,
    })
  })
})

describe('useDeleteVendorInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes an invoice', async () => {
    vi.mocked(apiDelete).mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useDeleteVendorInvoice(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('inv-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiDelete).toHaveBeenCalledWith('/fms/vendor-invoices/inv-1')
  })
})
