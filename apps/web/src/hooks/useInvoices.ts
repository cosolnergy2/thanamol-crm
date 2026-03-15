import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Invoice,
  InvoiceWithRelations,
  InvoiceListResponse,
  InvoiceQueryParams,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
} from '@thanamol/shared'

function buildInvoiceQueryString(params: InvoiceQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.contractId) query.set('contractId', params.contractId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const INVOICE_QUERY_KEYS = {
  all: ['invoices'] as const,
  list: (params: InvoiceQueryParams) => ['invoices', 'list', params] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
}

export function useInvoices(params: InvoiceQueryParams = {}) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(params),
    queryFn: () => apiGet<InvoiceListResponse>(`/invoices${buildInvoiceQueryString(params)}`),
  })
}

export function useInvoiceById(id: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ invoice: InvoiceWithRelations }>(`/invoices/${id}`),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => apiPost<{ invoice: Invoice }>('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceRequest }) =>
      apiPut<{ invoice: Invoice }>(`/invoices/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
    },
  })
}
