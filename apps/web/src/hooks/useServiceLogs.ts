import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ServiceLog,
  ServiceLogListResponse,
  CreateServiceLogRequest,
  UpdateServiceLogRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const SERVICE_LOG_QUERY_KEYS = {
  all: ['serviceLogs'] as const,
  list: (params: ServiceLogListParams) => ['serviceLogs', 'list', params] as const,
  detail: (id: string) => ['serviceLogs', id] as const,
}

export type ServiceLogListParams = {
  projectId?: string
  serviceType?: string
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

export function useServiceLogs(params: ServiceLogListParams) {
  return useQuery({
    queryKey: SERVICE_LOG_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ServiceLogListResponse>(
        `/fms/service-logs${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useServiceLog(id: string) {
  return useQuery({
    queryKey: SERVICE_LOG_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ serviceLog: ServiceLog }>(`/fms/service-logs/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateServiceLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateServiceLogRequest) =>
      apiPost<{ serviceLog: ServiceLog }>('/fms/service-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LOG_QUERY_KEYS.all })
    },
  })
}

export function useUpdateServiceLog(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateServiceLogRequest) =>
      apiPut<{ serviceLog: ServiceLog }>(`/fms/service-logs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LOG_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: SERVICE_LOG_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteServiceLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/service-logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LOG_QUERY_KEYS.all })
    },
  })
}
