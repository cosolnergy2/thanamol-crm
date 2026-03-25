import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CleaningChecklist,
  CleaningChecklistListResponse,
  CreateCleaningChecklistRequest,
  UpdateCleaningChecklistRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const CLEANING_CHECKLIST_QUERY_KEYS = {
  all: ['cleaningChecklists'] as const,
  list: (params: CleaningChecklistListParams) =>
    ['cleaningChecklists', 'list', params] as const,
  detail: (id: string) => ['cleaningChecklists', id] as const,
}

export type CleaningChecklistListParams = {
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

export function useCleaningChecklists(params: CleaningChecklistListParams) {
  return useQuery({
    queryKey: CLEANING_CHECKLIST_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<CleaningChecklistListResponse>(
        `/fms/cleaning-checklists${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useCleaningChecklist(id: string) {
  return useQuery({
    queryKey: CLEANING_CHECKLIST_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ checklist: CleaningChecklist }>(`/fms/cleaning-checklists/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateCleaningChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCleaningChecklistRequest) =>
      apiPost<{ checklist: CleaningChecklist }>('/fms/cleaning-checklists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLEANING_CHECKLIST_QUERY_KEYS.all })
    },
  })
}

export function useUpdateCleaningChecklist(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCleaningChecklistRequest) =>
      apiPut<{ checklist: CleaningChecklist }>(`/fms/cleaning-checklists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLEANING_CHECKLIST_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CLEANING_CHECKLIST_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteCleaningChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/cleaning-checklists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLEANING_CHECKLIST_QUERY_KEYS.all })
    },
  })
}
