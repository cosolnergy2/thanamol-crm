import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  LandscapeTask,
  LandscapeTaskListResponse,
  CreateLandscapeTaskRequest,
  UpdateLandscapeTaskRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const LANDSCAPE_TASK_QUERY_KEYS = {
  all: ['landscapeTasks'] as const,
  list: (params: LandscapeTaskListParams) => ['landscapeTasks', 'list', params] as const,
  detail: (id: string) => ['landscapeTasks', id] as const,
}

export type LandscapeTaskListParams = {
  projectId?: string
  status?: string
  zoneId?: string
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

export function useLandscapeTasks(params: LandscapeTaskListParams) {
  return useQuery({
    queryKey: LANDSCAPE_TASK_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<LandscapeTaskListResponse>(
        `/fms/landscape${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useLandscapeTask(id: string) {
  return useQuery({
    queryKey: LANDSCAPE_TASK_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ task: LandscapeTask }>(`/fms/landscape/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateLandscapeTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLandscapeTaskRequest) =>
      apiPost<{ task: LandscapeTask }>('/fms/landscape', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDSCAPE_TASK_QUERY_KEYS.all })
    },
  })
}

export function useUpdateLandscapeTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateLandscapeTaskRequest) =>
      apiPut<{ task: LandscapeTask }>(`/fms/landscape/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDSCAPE_TASK_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: LANDSCAPE_TASK_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteLandscapeTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/landscape/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDSCAPE_TASK_QUERY_KEYS.all })
    },
  })
}
