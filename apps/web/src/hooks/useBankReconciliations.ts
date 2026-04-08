import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'

export const RECON_QUERY_KEYS = {
  all: ['bank-reconciliations'] as const,
  list: (params: Record<string, unknown>) => ['bank-reconciliations', 'list', params] as const,
  detail: (id: string) => ['bank-reconciliations', id] as const,
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

export function useBankReconciliations(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: RECON_QUERY_KEYS.list(params),
    queryFn: () => apiGet<any>(`/finance/bank-reconciliations${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useBankReconciliation(id: string) {
  return useQuery({
    queryKey: RECON_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<any>(`/finance/bank-reconciliations/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateBankReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiPost<any>('/finance/bank-reconciliations', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RECON_QUERY_KEYS.all }) },
  })
}

export function useFinalizeBankReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/finance/bank-reconciliations/${id}/finalize`, {}),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: RECON_QUERY_KEYS.all })
      qc.invalidateQueries({ queryKey: RECON_QUERY_KEYS.detail(id) })
    },
  })
}
