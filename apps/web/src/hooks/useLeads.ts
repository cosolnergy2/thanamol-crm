import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Lead,
  LeadListResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
} from '@thanamol/shared'

type LeadQueryParams = {
  page?: number
  limit?: number
  search?: string
  status?: string
  source?: string
  assignedTo?: string
}

function buildLeadQueryString(params: LeadQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.source && params.source !== 'all') query.set('source', params.source)
  if (params.assignedTo && params.assignedTo !== 'all') query.set('assignedTo', params.assignedTo)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const LEAD_QUERY_KEYS = {
  all: ['leads'] as const,
  list: (params: LeadQueryParams) => ['leads', 'list', params] as const,
  detail: (id: string) => ['leads', id] as const,
}

export function useLeads(params: LeadQueryParams = {}) {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.list(params),
    queryFn: () => apiGet<LeadListResponse>(`/leads${buildLeadQueryString(params)}`),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: LEAD_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ lead: Lead }>(`/leads/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLeadRequest) => apiPost<{ lead: Lead }>('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.all })
    },
  })
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateLeadRequest) => apiPut<{ lead: Lead }>(`/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAD_QUERY_KEYS.all })
    },
  })
}
