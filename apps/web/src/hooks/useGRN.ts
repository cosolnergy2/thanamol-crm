import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  GRNListResponse,
  GoodsReceivedNoteWithRelations,
  CreateGRNRequest,
  UpdateGRNRequest,
  GRNQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'
import { INVENTORY_QUERY_KEYS } from './useInventory'

export const GRN_QUERY_KEYS = {
  all: ['grn'] as const,
  list: (params: GRNQueryParams) => ['grn', 'list', params] as const,
  detail: (id: string) => ['grn', id] as const,
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

export function useGRNList(params: GRNQueryParams = {}) {
  return useQuery({
    queryKey: GRN_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<GRNListResponse>(`/fms/grn${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useGRN(id: string) {
  return useQuery({
    queryKey: GRN_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ grn: GoodsReceivedNoteWithRelations }>(`/fms/grn/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateGRN() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGRNRequest) =>
      apiPost<{ grn: GoodsReceivedNoteWithRelations }>('/fms/grn', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.all })
    },
  })
}

export function useUpdateGRN(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateGRNRequest) =>
      apiPut<{ grn: GoodsReceivedNoteWithRelations }>(`/fms/grn/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.detail(id) })
    },
  })
}

export function useAcceptGRN(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { inspectionNotes?: string }) =>
      apiPatch<{ grn: GoodsReceivedNoteWithRelations }>(`/fms/grn/${id}/accept`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}

export function useDeleteGRN() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/grn/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRN_QUERY_KEYS.all })
    },
  })
}
