import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'

export const PV_QUERY_KEYS = {
  all: ['payment-vouchers'] as const,
  list: (params: Record<string, unknown>) => ['payment-vouchers', 'list', params] as const,
  detail: (id: string) => ['payment-vouchers', id] as const,
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

export function usePaymentVouchers(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: PV_QUERY_KEYS.list(params),
    queryFn: () => apiGet<any>(`/finance/payment-vouchers${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function usePaymentVoucher(id: string) {
  return useQuery({
    queryKey: PV_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<any>(`/finance/payment-vouchers/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreatePaymentVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiPost<any>('/finance/payment-vouchers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PV_QUERY_KEYS.all }) },
  })
}

export function useApprovePaymentVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/finance/payment-vouchers/${id}/approve`, {}),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: PV_QUERY_KEYS.all })
      qc.invalidateQueries({ queryKey: PV_QUERY_KEYS.detail(id) })
    },
  })
}

export function usePayPaymentVoucher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/finance/payment-vouchers/${id}/pay`, {}),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: PV_QUERY_KEYS.all })
      qc.invalidateQueries({ queryKey: PV_QUERY_KEYS.detail(id) })
    },
  })
}
