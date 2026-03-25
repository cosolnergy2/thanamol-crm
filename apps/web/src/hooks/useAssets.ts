import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  AssetListResponse,
  AssetWithRelations,
  AssetCategoryListResponse,
  AssetCategoryWithChildren,
  CreateAssetRequest,
  UpdateAssetRequest,
  CreateAssetCategoryRequest,
  UpdateAssetCategoryRequest,
  AssetQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const ASSET_QUERY_KEYS = {
  all: ['assets'] as const,
  list: (params: AssetQueryParams) => ['assets', 'list', params] as const,
  detail: (id: string) => ['assets', id] as const,
  categories: ['asset-categories'] as const,
  categoryList: (params: Record<string, unknown>) =>
    ['asset-categories', 'list', params] as const,
  categoryDetail: (id: string) => ['asset-categories', id] as const,
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

export function useAssets(params: AssetQueryParams = {}) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<AssetListResponse>(`/fms/assets${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ asset: AssetWithRelations & { work_orders: unknown[]; calibrations: unknown[]; pm_schedules: unknown[] } }>(`/fms/assets/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssetRequest) =>
      apiPost<{ asset: AssetWithRelations }>('/fms/assets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.all })
    },
  })
}

export function useUpdateAsset(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateAssetRequest) =>
      apiPut<{ asset: AssetWithRelations }>(`/fms/assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.all })
    },
  })
}

// Asset Category hooks

export function useAssetCategories(params: { search?: string; parentId?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.categoryList(params as Record<string, unknown>),
    queryFn: () =>
      apiGet<AssetCategoryListResponse>(
        `/fms/asset-categories${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 60 * 1000,
  })
}

export function useAssetCategory(id: string) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.categoryDetail(id),
    queryFn: () =>
      apiGet<{ category: AssetCategoryWithChildren }>(`/fms/asset-categories/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  })
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssetCategoryRequest) =>
      apiPost<{ category: AssetCategoryWithChildren }>('/fms/asset-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.categories })
    },
  })
}

export function useUpdateAssetCategory(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateAssetCategoryRequest) =>
      apiPut<{ category: AssetCategoryWithChildren }>(`/fms/asset-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.categories })
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.categoryDetail(id) })
    },
  })
}

export function useDeleteAssetCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/asset-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.categories })
    },
  })
}
