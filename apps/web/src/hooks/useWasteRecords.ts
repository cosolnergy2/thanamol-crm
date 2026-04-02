import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  WasteRecord,
  WasteRecordListResponse,
  CreateWasteRecordRequest,
  UpdateWasteRecordRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const WASTE_RECORD_QUERY_KEYS = {
  all: ['wasteRecords'] as const,
  list: (params: WasteRecordListParams) => ['wasteRecords', 'list', params] as const,
  detail: (id: string) => ['wasteRecords', id] as const,
}

export type WasteRecordListParams = {
  projectId?: string
  wasteType?: string
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

export function useWasteRecords(params: WasteRecordListParams) {
  return useQuery({
    queryKey: WASTE_RECORD_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<WasteRecordListResponse>(
        `/fms/waste${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useWasteRecord(id: string) {
  return useQuery({
    queryKey: WASTE_RECORD_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ record: WasteRecord }>(`/fms/waste/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateWasteRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWasteRecordRequest) =>
      apiPost<{ record: WasteRecord }>('/fms/waste', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WASTE_RECORD_QUERY_KEYS.all })
    },
  })
}

export function useUpdateWasteRecord(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateWasteRecordRequest) =>
      apiPut<{ record: WasteRecord }>(`/fms/waste/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WASTE_RECORD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WASTE_RECORD_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteWasteRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/waste/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WASTE_RECORD_QUERY_KEYS.all })
    },
  })
}
