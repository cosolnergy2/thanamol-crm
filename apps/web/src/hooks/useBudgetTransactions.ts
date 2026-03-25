import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BudgetTransactionWithRelations,
  CreateBudgetTransactionRequest,
  PaginatedResponse,
} from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'
import { BUDGET_QUERY_KEYS } from './useBudgets'

export const BUDGET_TRANSACTION_QUERY_KEYS = {
  list: (budgetId: string) => ['budget-transactions', budgetId] as const,
}

export function useBudgetTransactions(budgetId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: [...BUDGET_TRANSACTION_QUERY_KEYS.list(budgetId), page],
    queryFn: () =>
      apiGet<PaginatedResponse<BudgetTransactionWithRelations>>(
        `/fms/budgets/${budgetId}/transactions?page=${page}&limit=${limit}`
      ),
    enabled: Boolean(budgetId),
    staleTime: 30 * 1000,
  })
}

export function useCreateBudgetTransaction(budgetId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetTransactionRequest) =>
      apiPost<{ transaction: BudgetTransactionWithRelations }>(
        `/fms/budgets/${budgetId}/transactions`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BUDGET_TRANSACTION_QUERY_KEYS.list(budgetId),
      })
      queryClient.invalidateQueries({ queryKey: BUDGET_QUERY_KEYS.detail(budgetId) })
    },
  })
}
