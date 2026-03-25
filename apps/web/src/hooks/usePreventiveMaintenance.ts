import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PMListResponse,
  PMWithRelations,
  CreatePMRequest,
  UpdatePMRequest,
  PMQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const PM_QUERY_KEYS = {
  all: ['preventive-maintenance'] as const,
  list: (params: PMQueryParams) => ['preventive-maintenance', 'list', params] as const,
  detail: (id: string) => ['preventive-maintenance', id] as const,
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

export function usePreventiveMaintenances(params: PMQueryParams = {}) {
  return useQuery({
    queryKey: PM_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<PMListResponse>(
        `/fms/preventive-maintenance${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function usePreventiveMaintenance(id: string) {
  return useQuery({
    queryKey: PM_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ pm: PMWithRelations & { logs: unknown[] } }>(
        `/fms/preventive-maintenance/${id}`
      ),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreatePM() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePMRequest) =>
      apiPost<{ pm: PMWithRelations }>('/fms/preventive-maintenance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PM_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePM(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePMRequest) =>
      apiPut<{ pm: PMWithRelations }>(`/fms/preventive-maintenance/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PM_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PM_QUERY_KEYS.detail(id) })
    },
  })
}

export function useGeneratePMWorkOrder(pmId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scheduledDate?: string) =>
      apiPost<{ workOrder: unknown }>(
        `/fms/preventive-maintenance/${pmId}/generate-work-order`,
        { scheduledDate }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PM_QUERY_KEYS.detail(pmId) })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useDeletePM() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/preventive-maintenance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PM_QUERY_KEYS.all })
    },
  })
}
