import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ZoneListResponse,
  ZoneWithChildren,
  CreateZoneRequest,
  UpdateZoneRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const ZONE_QUERY_KEYS = {
  all: ['zones'] as const,
  list: (params: ZoneListParams) => ['zones', 'list', params] as const,
  detail: (id: string) => ['zones', id] as const,
}

export type ZoneListParams = {
  projectId: string
  parentZoneId?: string
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

export function useZones(params: ZoneListParams) {
  return useQuery({
    queryKey: ZONE_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ZoneListResponse>(`/fms/zones${buildQueryString(params as Record<string, unknown>)}`),
    enabled: Boolean(params.projectId),
    staleTime: 30 * 1000,
  })
}

export function useZone(id: string) {
  return useQuery({
    queryKey: ZONE_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ zone: ZoneWithChildren }>(`/fms/zones/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateZoneRequest) =>
      apiPost<{ zone: ZoneWithChildren }>('/fms/zones', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ZONE_QUERY_KEYS.all })
    },
  })
}

export function useUpdateZone(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateZoneRequest) =>
      apiPut<{ zone: ZoneWithChildren }>(`/fms/zones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ZONE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: ZONE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ZONE_QUERY_KEYS.all })
    },
  })
}
