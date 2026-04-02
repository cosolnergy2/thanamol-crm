import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  EmergencyDrillListResponse,
  EmergencyDrillWithRelations,
  CreateEmergencyDrillRequest,
  UpdateEmergencyDrillRequest,
  CompleteDrillRequest,
  EmergencyDrillQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'

export const EMERGENCY_DRILL_QUERY_KEYS = {
  all: ['emergency-drills'] as const,
  list: (params: EmergencyDrillQueryParams) => ['emergency-drills', 'list', params] as const,
  detail: (id: string) => ['emergency-drills', id] as const,
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

export function useEmergencyDrills(params: EmergencyDrillQueryParams = {}) {
  return useQuery({
    queryKey: EMERGENCY_DRILL_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<EmergencyDrillListResponse>(
        `/fms/drills${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useEmergencyDrill(id: string) {
  return useQuery({
    queryKey: EMERGENCY_DRILL_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ drill: EmergencyDrillWithRelations }>(`/fms/drills/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateEmergencyDrill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEmergencyDrillRequest) =>
      apiPost<{ drill: EmergencyDrillWithRelations }>('/fms/drills', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.all })
    },
  })
}

export function useUpdateEmergencyDrill(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateEmergencyDrillRequest) =>
      apiPut<{ drill: EmergencyDrillWithRelations }>(`/fms/drills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCompleteDrill(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CompleteDrillRequest) =>
      apiPatch<{ drill: EmergencyDrillWithRelations }>(`/fms/drills/${id}/complete`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteEmergencyDrill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/drills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_DRILL_QUERY_KEYS.all })
    },
  })
}
