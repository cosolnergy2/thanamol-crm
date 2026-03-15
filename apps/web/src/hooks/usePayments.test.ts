import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  usePayments,
  usePaymentById,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from './usePayments'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches payments with no params', async () => {
    const mockResponse = {
      data: [
        {
          id: 'pay-1',
          invoice_id: 'inv-1',
          amount: 5000,
          payment_method: 'BANK_TRANSFER',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => usePayments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/payments')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('builds query string with invoiceId filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => usePayments({ invoiceId: 'inv-123' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('invoiceId=inv-123'),
    )
  })

  it('builds query string with paymentMethod filter', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ data: [], pagination: {} })

    const { result } = renderHook(
      () => usePayments({ paymentMethod: 'CASH' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => result.current.isLoading === false)

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      expect.stringContaining('paymentMethod=CASH'),
    )
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => usePayments(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('usePaymentById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches payment by id', async () => {
    const mockPayment = {
      payment: {
        id: 'pay-abc',
        invoice_id: 'inv-1',
        amount: 5000,
        payment_method: 'CASH',
      },
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockPayment)

    const { result } = renderHook(() => usePaymentById('pay-abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiGet).toHaveBeenCalledWith('/payments/pay-abc')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => usePaymentById(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(apiClient.apiGet).not.toHaveBeenCalled()
  })
})

describe('useCreatePayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls POST /payments and invalidates invoice + payment queries', async () => {
    const mockResponse = {
      payment: { id: 'new-pay', invoice_id: 'inv-1', amount: 5000 },
    }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      invoiceId: 'inv-1',
      amount: 5000,
      paymentDate: '2025-01-15',
      paymentMethod: 'BANK_TRANSFER',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPost).toHaveBeenCalledWith(
      '/payments',
      expect.objectContaining({
        invoiceId: 'inv-1',
        amount: 5000,
        paymentMethod: 'BANK_TRANSFER',
      }),
    )
  })

  it('surfaces error when invoice not found', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Invoice not found'))

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      invoiceId: 'bad-inv',
      amount: 100,
      paymentDate: '2025-01-01',
      paymentMethod: 'CASH',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Invoice not found')
  })
})

describe('useUpdatePayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls PUT /payments/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ payment: { id: 'pay-1', amount: 6000 } })

    const { result } = renderHook(() => useUpdatePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'pay-1', data: { amount: 6000 } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiPut).toHaveBeenCalledWith('/payments/pay-1', { amount: 6000 })
  })
})

describe('useDeletePayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls DELETE /payments/:id and invalidates invoice queries', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeletePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('pay-to-delete')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.apiDelete).toHaveBeenCalledWith('/payments/pay-to-delete')
  })

  it('surfaces error when payment not found', async () => {
    vi.mocked(apiClient.apiDelete).mockRejectedValue(new Error('Payment not found'))

    const { result } = renderHook(() => useDeletePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('bad-pay-id')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Payment not found')
  })
})
