import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BudgetTemplate,
  CreateBudgetTemplateRequest,
  UpdateBudgetTemplateRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const BUDGET_TEMPLATE_QUERY_KEYS = {
  all: ['budget-templates'] as const,
  detail: (id: string) => ['budget-templates', id] as const,
}

export function useBudgetTemplates() {
  return useQuery({
    queryKey: BUDGET_TEMPLATE_QUERY_KEYS.all,
    queryFn: () => apiGet<{ templates: BudgetTemplate[] }>('/fms/budget-templates'),
    staleTime: 60 * 1000,
  })
}

export function useBudgetTemplate(id: string) {
  return useQuery({
    queryKey: BUDGET_TEMPLATE_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ template: BudgetTemplate }>(`/fms/budget-templates/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  })
}

export function useCreateBudgetTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBudgetTemplateRequest) =>
      apiPost<{ template: BudgetTemplate }>('/fms/budget-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_TEMPLATE_QUERY_KEYS.all })
    },
  })
}

export function useUpdateBudgetTemplate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateBudgetTemplateRequest) =>
      apiPut<{ template: BudgetTemplate }>(`/fms/budget-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_TEMPLATE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: BUDGET_TEMPLATE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteBudgetTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/budget-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_TEMPLATE_QUERY_KEYS.all })
    },
  })
}
