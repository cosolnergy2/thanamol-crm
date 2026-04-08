import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { APInvoice, APInvoiceListResponse, CreateAPInvoiceRequest, APAgingResponse } from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'

export const AP_QUERY_KEYS = {
  all: ['ap-invoices'] as const,
  list: (params: Record<string, unknown>) => ['ap-invoices', 'list', params] as const,
  detail: (id: string) => ['ap-invoices', id] as const,
  aging: ['ap-invoices', 'aging'] as const,
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

export function useAPInvoices(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: AP_QUERY_KEYS.list(params),
    queryFn: () => apiGet<APInvoiceListResponse>(`/finance/ap-invoices${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useAPInvoice(id: string) {
  return useQuery({
    queryKey: AP_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ invoice: APInvoice }>(`/finance/ap-invoices/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateAPInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAPInvoiceRequest) =>
      apiPost<{ invoice: APInvoice }>('/finance/ap-invoices', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: AP_QUERY_KEYS.all }) },
  })
}

export function useAPAging() {
  return useQuery({
    queryKey: AP_QUERY_KEYS.aging,
    queryFn: () => apiGet<APAgingResponse>('/finance/ap-invoices/aging'),
    staleTime: 60 * 1000,
  })
}
