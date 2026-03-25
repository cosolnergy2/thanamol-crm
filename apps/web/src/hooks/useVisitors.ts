import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Visitor,
  VisitorListResponse,
  CreateVisitorRequest,
  UpdateVisitorRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api-client'

export const VISITOR_QUERY_KEYS = {
  all: ['visitors'] as const,
  list: (params: VisitorListParams) => ['visitors', 'list', params] as const,
  detail: (id: string) => ['visitors', id] as const,
}

export type VisitorListParams = {
  projectId?: string
  status?: string
  search?: string
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

export function useVisitors(params: VisitorListParams) {
  return useQuery({
    queryKey: VISITOR_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<VisitorListResponse>(`/fms/visitors${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useVisitor(id: string) {
  return useQuery({
    queryKey: VISITOR_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ visitor: Visitor }>(`/fms/visitors/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVisitorRequest) =>
      apiPost<{ visitor: Visitor }>('/fms/visitors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all })
    },
  })
}

export function useUpdateVisitor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateVisitorRequest) =>
      apiPut<{ visitor: Visitor }>(`/fms/visitors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ visitor: Visitor }>(`/fms/visitors/${id}/check-in`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all })
    },
  })
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ visitor: Visitor }>(`/fms/visitors/${id}/check-out`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all })
    },
  })
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/visitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITOR_QUERY_KEYS.all })
    },
  })
}
