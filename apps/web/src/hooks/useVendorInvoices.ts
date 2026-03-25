import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  VendorInvoiceListResponse,
  VendorInvoiceWithRelations,
  CreateVendorInvoiceRequest,
  UpdateVendorInvoiceRequest,
  VendorInvoiceQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const VENDOR_INVOICE_QUERY_KEYS = {
  all: ['vendor-invoices'] as const,
  list: (params: VendorInvoiceQueryParams) => ['vendor-invoices', 'list', params] as const,
  detail: (id: string) => ['vendor-invoices', id] as const,
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export function useVendorInvoices(params: VendorInvoiceQueryParams = {}) {
  return useQuery({
    queryKey: VENDOR_INVOICE_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<VendorInvoiceListResponse>(
        `/fms/vendor-invoices${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useVendorInvoice(id: string) {
  return useQuery({
    queryKey: VENDOR_INVOICE_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ invoice: VendorInvoiceWithRelations }>(`/fms/vendor-invoices/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateVendorInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVendorInvoiceRequest) =>
      apiPost<{ invoice: VendorInvoiceWithRelations }>('/fms/vendor-invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.all })
    },
  })
}

export function useUpdateVendorInvoice(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateVendorInvoiceRequest) =>
      apiPut<{ invoice: VendorInvoiceWithRelations }>(`/fms/vendor-invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useMarkVendorInvoicePaid(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentDate?: string) =>
      apiPost<{ invoice: VendorInvoiceWithRelations }>(`/fms/vendor-invoices/${id}/mark-paid`, {
        paymentDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteVendorInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/vendor-invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_INVOICE_QUERY_KEYS.all })
    },
  })
}
