import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { BudgetLine, CreateBudgetLineRequest, UpdateBudgetLineRequest } from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import { BUDGET_QUERY_KEYS } from './useBudgets'

export const BUDGET_LINE_QUERY_KEYS = {
  list: (budgetId: string) => ['budget-lines', budgetId] as const,
}

export function useBudgetLines(budgetId: string) {
  return useQuery({
    queryKey: BUDGET_LINE_QUERY_KEYS.list(budgetId),
    queryFn: () => apiGet<{ lines: BudgetLine[] }>(`/fms/budget/${budgetId}/lines`),
    enabled: Boolean(budgetId),
    staleTime: 30 * 1000,
  })
}

export function useCreateBudgetLine(budgetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetLineRequest) =>
      apiPost<{ line: BudgetLine }>(`/fms/budget/${budgetId}/lines`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_LINE_QUERY_KEYS.list(budgetId) })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(budgetId) })
    },
  })
}

export function useUpdateBudgetLine(budgetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBudgetLineRequest }) =>
      apiPut<{ line: BudgetLine }>(`/fms/lines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_LINE_QUERY_KEYS.list(budgetId) })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(budgetId) })
    },
  })
}

export function useDeleteBudgetLine(budgetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/lines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_LINE_QUERY_KEYS.list(budgetId) })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(budgetId) })
    },
  })
}
