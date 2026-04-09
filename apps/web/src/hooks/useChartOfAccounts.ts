import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ChartOfAccount,
  ChartOfAccountWithChildren,
  ChartOfAccountListResponse,
  ChartOfAccountQueryParams,
  CreateChartOfAccountRequest,
  UpdateChartOfAccountRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const COA_QUERY_KEYS = {
  all: ['chart-of-accounts'] as const,
  list: (params: ChartOfAccountQueryParams) => ['chart-of-accounts', 'list', params] as const,
  tree: ['chart-of-accounts', 'tree'] as const,
  detail: (id: string) => ['chart-of-accounts', id] as const,
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

export function useChartOfAccounts(params: ChartOfAccountQueryParams = {}) {
  return useQuery({
    queryKey: COA_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ChartOfAccountListResponse>(
        `/finance/chart-of-accounts${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useChartOfAccountTree() {
  return useQuery({
    queryKey: COA_QUERY_KEYS.tree,
    queryFn: () => apiGet<{ data: ChartOfAccountWithChildren[] }>('/finance/chart-of-accounts/tree'),
    staleTime: 60 * 1000,
  })
}

export function useChartOfAccount(id: string) {
  return useQuery({
    queryKey: COA_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ account: ChartOfAccountWithChildren }>(`/finance/chart-of-accounts/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateChartOfAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateChartOfAccountRequest) =>
      apiPost<{ account: ChartOfAccount }>('/finance/chart-of-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COA_QUERY_KEYS.all })
    },
  })
}

export function useUpdateChartOfAccount(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateChartOfAccountRequest) =>
      apiPut<{ account: ChartOfAccount }>(`/finance/chart-of-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COA_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: COA_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteChartOfAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/finance/chart-of-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COA_QUERY_KEYS.all })
    },
  })
}
