import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DisasterPlanListResponse,
  DisasterPlanWithRelations,
  CreateDisasterPlanRequest,
  UpdateDisasterPlanRequest,
  DisasterPlanQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const DISASTER_PLAN_QUERY_KEYS = {
  all: ['disaster-plans'] as const,
  list: (params: DisasterPlanQueryParams) => ['disaster-plans', 'list', params] as const,
  detail: (id: string) => ['disaster-plans', id] as const,
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

export function useDisasterPlans(params: DisasterPlanQueryParams = {}) {
  return useQuery({
    queryKey: DISASTER_PLAN_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<DisasterPlanListResponse>(
        `/fms/disaster-plans${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useDisasterPlan(id: string) {
  return useQuery({
    queryKey: DISASTER_PLAN_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ plan: DisasterPlanWithRelations }>(`/fms/disaster-plans/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateDisasterPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDisasterPlanRequest) =>
      apiPost<{ plan: DisasterPlanWithRelations }>('/fms/disaster-plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISASTER_PLAN_QUERY_KEYS.all })
    },
  })
}

export function useUpdateDisasterPlan(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateDisasterPlanRequest) =>
      apiPut<{ plan: DisasterPlanWithRelations }>(`/fms/disaster-plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISASTER_PLAN_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: DISASTER_PLAN_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteDisasterPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/disaster-plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISASTER_PLAN_QUERY_KEYS.all })
    },
  })
}
