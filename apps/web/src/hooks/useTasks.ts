import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  TaskListResponse,
  TaskWithRelations,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  TaskComment,
  CreateTaskCommentRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const TASK_QUERY_KEYS = {
  all: ['tasks'] as const,
  list: (params: TaskQueryParams) => ['tasks', 'list', params] as const,
  detail: (id: string) => ['tasks', id] as const,
  comments: (id: string) => ['tasks', id, 'comments'] as const,
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

export function useTasks(params: TaskQueryParams = {}) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<TaskListResponse>(`/tasks${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useTaskById(id: string) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ task: TaskWithRelations }>(`/tasks/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) =>
      apiPost<{ task: TaskWithRelations }>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all })
    },
  })
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateTaskRequest) =>
      apiPut<{ task: TaskWithRelations }>(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ task: TaskWithRelations }>(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.all })
    },
  })
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: TASK_QUERY_KEYS.comments(taskId),
    queryFn: () => apiGet<{ comments: TaskComment[] }>(`/tasks/${taskId}/comments`),
    enabled: Boolean(taskId),
    staleTime: 30 * 1000,
  })
}

export function useCreateTaskComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskCommentRequest) =>
      apiPost<{ comment: TaskComment }>(`/tasks/${taskId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.comments(taskId) })
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEYS.detail(taskId) })
    },
  })
}
