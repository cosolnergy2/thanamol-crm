import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  SecurityPatrol,
  SecurityPatrolListResponse,
  CreateSecurityPatrolRequest,
  UpdateSecurityPatrolRequest,
  PatrolStatus,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api-client'

export const SECURITY_PATROL_QUERY_KEYS = {
  all: ['securityPatrols'] as const,
  list: (params: SecurityPatrolListParams) => ['securityPatrols', 'list', params] as const,
  detail: (id: string) => ['securityPatrols', id] as const,
}

export type SecurityPatrolListParams = {
  projectId?: string
  status?: string
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

export function useSecurityPatrols(params: SecurityPatrolListParams) {
  return useQuery({
    queryKey: SECURITY_PATROL_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<SecurityPatrolListResponse>(
        `/fms/security-patrols${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useSecurityPatrol(id: string) {
  return useQuery({
    queryKey: SECURITY_PATROL_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ patrol: SecurityPatrol }>(`/fms/security-patrols/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateSecurityPatrol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSecurityPatrolRequest) =>
      apiPost<{ patrol: SecurityPatrol }>('/fms/security-patrols', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.all })
    },
  })
}

export function useUpdateSecurityPatrol(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateSecurityPatrolRequest) =>
      apiPut<{ patrol: SecurityPatrol }>(`/fms/security-patrols/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useUpdatePatrolStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: PatrolStatus) =>
      apiPatch<{ patrol: SecurityPatrol }>(`/fms/security-patrols/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteSecurityPatrol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/security-patrols/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECURITY_PATROL_QUERY_KEYS.all })
    },
  })
}
