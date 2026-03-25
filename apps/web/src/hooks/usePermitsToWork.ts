import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PermitToWorkListResponse,
  PermitToWorkWithRelations,
  CreatePermitToWorkRequest,
  UpdatePermitToWorkRequest,
  PermitToWorkQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'

export const PTW_QUERY_KEYS = {
  all: ['permits-to-work'] as const,
  list: (params: PermitToWorkQueryParams) => ['permits-to-work', 'list', params] as const,
  detail: (id: string) => ['permits-to-work', id] as const,
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

export function usePermitsToWork(params: PermitToWorkQueryParams = {}) {
  return useQuery({
    queryKey: PTW_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<PermitToWorkListResponse>(
        `/fms/permits-to-work${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function usePermitToWork(id: string) {
  return useQuery({
    queryKey: PTW_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreatePermitToWork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePermitToWorkRequest) =>
      apiPost<{ permit: PermitToWorkWithRelations }>('/fms/permits-to-work', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePermitToWork(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePermitToWorkRequest) =>
      apiPut<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useSubmitPermit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useApprovePermit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useActivatePermit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}/activate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useClosePermit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useRejectPermit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) =>
      apiPatch<{ permit: PermitToWorkWithRelations }>(`/fms/permits-to-work/${id}/reject`, {
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeletePermitToWork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/permits-to-work/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PTW_QUERY_KEYS.all })
    },
  })
}
