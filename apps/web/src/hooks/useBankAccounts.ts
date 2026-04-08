import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { BankAccount, BankAccountListResponse, CreateBankAccountRequest } from '@thanamol/shared'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'

export const BANK_QUERY_KEYS = {
  all: ['bank-accounts'] as const,
  list: (params: Record<string, unknown>) => ['bank-accounts', 'list', params] as const,
  detail: (id: string) => ['bank-accounts', id] as const,
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

export function useBankAccounts(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: BANK_QUERY_KEYS.list(params),
    queryFn: () => apiGet<BankAccountListResponse>(`/finance/bank-accounts${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: BANK_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ account: BankAccount }>(`/finance/bank-accounts/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBankAccountRequest) =>
      apiPost<{ account: BankAccount }>('/finance/bank-accounts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: BANK_QUERY_KEYS.all }) },
  })
}

export function useUpdateBankAccount(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateBankAccountRequest> & { isActive?: boolean }) =>
      apiPut<{ account: BankAccount }>(`/finance/bank-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BANK_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BANK_QUERY_KEYS.detail(id) })
    },
  })
}
