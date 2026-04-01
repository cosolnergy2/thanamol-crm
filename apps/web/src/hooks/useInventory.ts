import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  InventoryItemListResponse,
  InventoryItemWithRelations,
  InventoryCategoryListResponse,
  InventoryCategoryWithChildren,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  CreateInventoryCategoryRequest,
  UpdateInventoryCategoryRequest,
  InventoryQueryParams,
  AutoReorderRequest,
  AutoReorderResponse,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const INVENTORY_QUERY_KEYS = {
  all: ['inventory'] as const,
  list: (params: InventoryQueryParams) => ['inventory', 'list', params] as const,
  detail: (id: string) => ['inventory', id] as const,
  reorderAlerts: (projectId?: string) => ['inventory', 'reorder-alerts', projectId] as const,
  categories: ['inventory-categories'] as const,
  categoryList: (params: Record<string, unknown>) =>
    ['inventory-categories', 'list', params] as const,
  categoryDetail: (id: string) => ['inventory-categories', id] as const,
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

export function useInventoryItems(params: InventoryQueryParams = {}) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<InventoryItemListResponse>(
        `/fms/inventory${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{
        item: InventoryItemWithRelations & { stock_movements: unknown[] }
      }>(`/fms/inventory/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useReorderAlerts(projectId?: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.reorderAlerts(projectId),
    queryFn: () =>
      apiGet<{ data: InventoryItemWithRelations[] }>(
        `/fms/inventory/reorder-alerts/list${projectId ? `?projectId=${projectId}` : ''}`
      ),
    staleTime: 60 * 1000,
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInventoryItemRequest) =>
      apiPost<{ item: InventoryItemWithRelations }>('/fms/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}

export function useUpdateInventoryItem(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateInventoryItemRequest) =>
      apiPut<{ item: InventoryItemWithRelations }>(`/fms/inventory/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}

export function useInventoryCategories(
  params: { search?: string; parentId?: string; page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.categoryList(params as Record<string, unknown>),
    queryFn: () =>
      apiGet<InventoryCategoryListResponse>(
        `/fms/inventory-categories${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 60 * 1000,
  })
}

export function useInventoryCategory(id: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.categoryDetail(id),
    queryFn: () =>
      apiGet<{ category: InventoryCategoryWithChildren }>(`/fms/inventory-categories/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  })
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInventoryCategoryRequest) =>
      apiPost<{ category: InventoryCategoryWithChildren }>('/fms/inventory-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.categories })
    },
  })
}

export function useUpdateInventoryCategory(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateInventoryCategoryRequest) =>
      apiPut<{ category: InventoryCategoryWithChildren }>(
        `/fms/inventory-categories/${id}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.categories })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.categoryDetail(id) })
    },
  })
}

export function useDeleteInventoryCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/inventory-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.categories })
    },
  })
}

export function useAutoReorder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AutoReorderRequest) =>
      apiPost<AutoReorderResponse>('/fms/inventory/auto-reorder', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}
