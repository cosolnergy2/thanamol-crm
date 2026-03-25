import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PettyCashFundListResponse,
  PettyCashTransactionListResponse,
  CreatePettyCashFundRequest,
  UpdatePettyCashFundRequest,
  CreatePettyCashTransactionRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'

export const PETTY_CASH_QUERY_KEYS = {
  all: ['petty-cash'] as const,
  funds: (params: PettyCashFundListParams) => ['petty-cash', 'funds', params] as const,
  fund: (id: string) => ['petty-cash', 'funds', id] as const,
  transactions: (params: PettyCashTransactionListParams) =>
    ['petty-cash', 'transactions', params] as const,
}

export type PettyCashFundListParams = {
  projectId?: string
  page?: number
  limit?: number
}

export type PettyCashTransactionListParams = {
  projectId?: string
  fundId?: string
  status?: string
  page?: number
  limit?: number
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

export function usePettyCashFunds(params: PettyCashFundListParams = {}) {
  return useQuery({
    queryKey: PETTY_CASH_QUERY_KEYS.funds(params),
    queryFn: () =>
      apiGet<PettyCashFundListResponse>(
        `/fms/petty-cash/funds${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function usePettyCashFund(id: string) {
  return useQuery({
    queryKey: PETTY_CASH_QUERY_KEYS.fund(id),
    queryFn: () => apiGet<{ fund: unknown }>(`/fms/petty-cash/funds/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function usePettyCashTransactions(params: PettyCashTransactionListParams = {}) {
  return useQuery({
    queryKey: PETTY_CASH_QUERY_KEYS.transactions(params),
    queryFn: () =>
      apiGet<PettyCashTransactionListResponse>(
        `/fms/petty-cash/transactions${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useCreatePettyCashFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePettyCashFundRequest) =>
      apiPost<{ fund: unknown }>('/fms/petty-cash/funds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePettyCashFund(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePettyCashFundRequest) =>
      apiPut<{ fund: unknown }>(`/fms/petty-cash/funds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_QUERY_KEYS.all })
    },
  })
}

export function useCreatePettyCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePettyCashTransactionRequest) =>
      apiPost<{ transaction: unknown }>('/fms/petty-cash/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_QUERY_KEYS.all })
    },
  })
}

export function useApprovePettyCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      apiPost<{ transaction: unknown }>(`/fms/petty-cash/transactions/${id}/approve`, {
        approvedBy,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_QUERY_KEYS.all })
    },
  })
}

export function useRejectPettyCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      rejectedBy,
      reason,
    }: {
      id: string
      rejectedBy: string
      reason?: string
    }) =>
      apiPost<{ transaction: unknown }>(`/fms/petty-cash/transactions/${id}/reject`, {
        rejectedBy,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PETTY_CASH_QUERY_KEYS.all })
    },
  })
}
