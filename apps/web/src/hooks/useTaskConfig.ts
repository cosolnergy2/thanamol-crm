import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  TaskStatusListResponse,
  TaskStatus,
  CreateTaskStatusRequest,
  UpdateTaskStatusRequest,
  AutomationRuleListResponse,
  AutomationRule,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
} from '@thanamol/shared'

export function useTaskStatuses() {
  return useQuery({
    queryKey: ['task-statuses'],
    queryFn: () => apiGet<TaskStatusListResponse>('/task-statuses'),
  })
}

export function useCreateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskStatusRequest) => apiPost<TaskStatus>('/task-statuses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-statuses'] })
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskStatusRequest }) =>
      apiPut<TaskStatus>(`/task-statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-statuses'] })
    },
  })
}

export function useDeleteTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/task-statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-statuses'] })
    },
  })
}

export function useAutomationRules() {
  return useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => apiGet<AutomationRuleListResponse>('/automation-rules'),
  })
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAutomationRuleRequest) =>
      apiPost<AutomationRule>('/automation-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAutomationRuleRequest }) =>
      apiPut<AutomationRule>(`/automation-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/automation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })
}
