import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BudgetListResponse,
  BudgetWithRelations,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'

export const BUDGET_QUERY_KEYS = {
  all: ['budgets'] as const,
  list: (params: BudgetQueryParams) => ['budgets', 'list', params] as const,
  detail: (id: string) => ['budgets', id] as const,
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

export function useBudgets(params: BudgetQueryParams = {}) {
  return useQuery({
    queryKey: BUDGET_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<BudgetListResponse>(
        `/fms/budgets${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: BUDGET_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ budget: BudgetWithRelations & { transactions: unknown[] } }>(`/fms/budgets/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetRequest) =>
      apiPost<{ budget: BudgetWithRelations }>('/fms/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.all })
    },
  })
}

export function useUpdateBudget(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateBudgetRequest) =>
      apiPut<{ budget: BudgetWithRelations }>(`/fms/budgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(id) })
    },
  })
}

export function useApproveBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy?: string }) =>
      apiPost<{ budget: BudgetWithRelations }>(`/fms/budgets/${id}/approve`, { approvedBy }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(id) })
    },
  })
}

export function useActivateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ budget: BudgetWithRelations }>(`/fms/budgets/${id}/activate`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCloseBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ budget: BudgetWithRelations }>(`/fms/budgets/${id}/close`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(id) })
    },
  })
}
