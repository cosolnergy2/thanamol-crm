import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Payment,
  PaymentWithRelations,
  PaymentListResponse,
  PaymentQueryParams,
  CreatePaymentRequest,
  UpdatePaymentRequest,
} from '@thanamol/shared'
import { INVOICE_QUERY_KEYS } from './useInvoices'

function buildPaymentQueryString(params: PaymentQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.invoiceId) query.set('invoiceId', params.invoiceId)
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const PAYMENT_QUERY_KEYS = {
  all: ['payments'] as const,
  list: (params: PaymentQueryParams) => ['payments', 'list', params] as const,
  detail: (id: string) => ['payments', 'detail', id] as const,
}

export function usePayments(params: PaymentQueryParams = {}) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.list(params),
    queryFn: () => apiGet<PaymentListResponse>(`/payments${buildPaymentQueryString(params)}`),
  })
}

export function usePaymentById(id: string) {
  return useQuery({
    queryKey: PAYMENT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ payment: PaymentWithRelations }>(`/payments/${id}`),
    enabled: !!id,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => apiPost<{ payment: Payment }>('/payments', data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(variables.invoiceId) })
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentRequest }) =>
      apiPut<{ payment: Payment }>(`/payments/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}
