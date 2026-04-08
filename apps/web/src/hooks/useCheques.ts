import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChequeRegister, ChequeListResponse, CreateChequeRequest } from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'

export const CHEQUE_QUERY_KEYS = {
  all: ['cheques'] as const,
  list: (params: Record<string, unknown>) => ['cheques', 'list', params] as const,
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

export function useCheques(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: CHEQUE_QUERY_KEYS.list(params),
    queryFn: () => apiGet<ChequeListResponse>(`/finance/cheques${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useCreateCheque() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateChequeRequest) =>
      apiPost<{ cheque: ChequeRegister }>('/finance/cheques', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CHEQUE_QUERY_KEYS.all }) },
  })
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPost<{ cheque: ChequeRegister }>(`/finance/cheques/${id}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CHEQUE_QUERY_KEYS.all }) },
  })
}
