import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WithholdingTaxRecord, WhtListResponse, CreateWithholdingTaxRequest, TaxDashboardData } from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'

export const WHT_QUERY_KEYS = {
  all: ['withholding-tax'] as const,
  list: (params: Record<string, unknown>) => ['withholding-tax', 'list', params] as const,
  taxDashboard: (period?: string) => ['tax-dashboard', period] as const,
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

export function useWithholdingTaxRecords(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: WHT_QUERY_KEYS.list(params),
    queryFn: () => apiGet<WhtListResponse>(`/finance/withholding-tax${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useCreateWithholdingTax() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWithholdingTaxRequest) =>
      apiPost<{ record: WithholdingTaxRecord }>('/finance/withholding-tax', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: WHT_QUERY_KEYS.all }) },
  })
}

export function useIssueWithholdingTax() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ record: WithholdingTaxRecord }>(`/finance/withholding-tax/${id}/issue`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: WHT_QUERY_KEYS.all }) },
  })
}

export function useTaxDashboard(period?: string) {
  const qs = period ? `?period=${period}` : ''
  return useQuery({
    queryKey: WHT_QUERY_KEYS.taxDashboard(period),
    queryFn: () => apiGet<TaxDashboardData>(`/finance/tax-dashboard${qs}`),
    staleTime: 60 * 1000,
  })
}
