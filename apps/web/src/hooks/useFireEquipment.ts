import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  FireEquipmentListResponse,
  FireEquipmentWithRelations,
  CreateFireEquipmentRequest,
  UpdateFireEquipmentRequest,
  FireEquipmentQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const FIRE_EQUIPMENT_QUERY_KEYS = {
  all: ['fire-equipment'] as const,
  list: (params: FireEquipmentQueryParams) => ['fire-equipment', 'list', params] as const,
  detail: (id: string) => ['fire-equipment', id] as const,
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

export function useFireEquipment(params: FireEquipmentQueryParams = {}) {
  return useQuery({
    queryKey: FIRE_EQUIPMENT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<FireEquipmentListResponse>(
        `/fms/fire-equipment${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useFireEquipmentItem(id: string) {
  return useQuery({
    queryKey: FIRE_EQUIPMENT_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ equipment: FireEquipmentWithRelations }>(`/fms/fire-equipment/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateFireEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFireEquipmentRequest) =>
      apiPost<{ equipment: FireEquipmentWithRelations }>('/fms/fire-equipment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_EQUIPMENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateFireEquipment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateFireEquipmentRequest) =>
      apiPut<{ equipment: FireEquipmentWithRelations }>(`/fms/fire-equipment/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_EQUIPMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: FIRE_EQUIPMENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteFireEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/fire-equipment/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_EQUIPMENT_QUERY_KEYS.all })
    },
  })
}
