import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  StockIssueListResponse,
  StockIssueWithRelations,
  CreateStockIssueRequest,
  UpdateStockIssueRequest,
  StockIssueQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import { INVENTORY_QUERY_KEYS } from './useInventory'

export const STOCK_ISSUE_QUERY_KEYS = {
  all: ['stock-issues'] as const,
  list: (params: StockIssueQueryParams) => ['stock-issues', 'list', params] as const,
  detail: (id: string) => ['stock-issues', id] as const,
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

export function useStockIssues(params: StockIssueQueryParams = {}) {
  return useQuery({
    queryKey: STOCK_ISSUE_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<StockIssueListResponse>(
        `/fms/stock-issues${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useStockIssue(id: string) {
  return useQuery({
    queryKey: STOCK_ISSUE_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ issue: StockIssueWithRelations }>(`/fms/stock-issues/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateStockIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockIssueRequest) =>
      apiPost<{ issue: StockIssueWithRelations }>('/fms/stock-issues', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_ISSUE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}

export function useUpdateStockIssue(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateStockIssueRequest) =>
      apiPut<{ issue: StockIssueWithRelations }>(`/fms/stock-issues/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_ISSUE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: STOCK_ISSUE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteStockIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/stock-issues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_ISSUE_QUERY_KEYS.all })
    },
  })
}
