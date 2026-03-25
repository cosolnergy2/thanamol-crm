import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  KeyRecord,
  KeyRecordListResponse,
  CreateKeyRecordRequest,
  UpdateKeyRecordRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api-client'

export const KEY_RECORD_QUERY_KEYS = {
  all: ['keyRecords'] as const,
  list: (params: KeyRecordListParams) => ['keyRecords', 'list', params] as const,
  detail: (id: string) => ['keyRecords', id] as const,
}

export type KeyRecordListParams = {
  projectId?: string
  status?: string
  search?: string
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

export function useKeyRecords(params: KeyRecordListParams) {
  return useQuery({
    queryKey: KEY_RECORD_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<KeyRecordListResponse>(
        `/fms/key-records${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useKeyRecord(id: string) {
  return useQuery({
    queryKey: KEY_RECORD_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ keyRecord: KeyRecord }>(`/fms/key-records/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateKeyRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKeyRecordRequest) =>
      apiPost<{ keyRecord: KeyRecord }>('/fms/key-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.all })
    },
  })
}

export function useUpdateKeyRecord(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateKeyRecordRequest) =>
      apiPut<{ keyRecord: KeyRecord }>(`/fms/key-records/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.detail(id) })
    },
  })
}

export function useIssueKey(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignedTo: string) =>
      apiPatch<{ keyRecord: KeyRecord }>(`/fms/key-records/${id}/issue`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.detail(id) })
    },
  })
}

export function useReturnKey(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPatch<{ keyRecord: KeyRecord }>(`/fms/key-records/${id}/return`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteKeyRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/key-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY_RECORD_QUERY_KEYS.all })
    },
  })
}
