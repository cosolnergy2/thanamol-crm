import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  IncidentListResponse,
  IncidentWithRelations,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  IncidentQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'

export const INCIDENT_QUERY_KEYS = {
  all: ['incidents'] as const,
  list: (params: IncidentQueryParams) => ['incidents', 'list', params] as const,
  detail: (id: string) => ['incidents', id] as const,
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

export function useIncidents(params: IncidentQueryParams = {}) {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<IncidentListResponse>(
        `/fms/incidents${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: INCIDENT_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ incident: IncidentWithRelations }>(`/fms/incidents/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIncidentRequest) =>
      apiPost<{ incident: IncidentWithRelations }>('/fms/incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateIncident(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateIncidentRequest) =>
      apiPut<{ incident: IncidentWithRelations }>(`/fms/incidents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useInvestigateIncident(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ incident: IncidentWithRelations }>(`/fms/incidents/${id}/investigate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useResolveIncident(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { rootCause?: string; correctiveActions?: unknown[] }) =>
      apiPatch<{ incident: IncidentWithRelations }>(`/fms/incidents/${id}/resolve`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCloseIncident(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ incident: IncidentWithRelations }>(`/fms/incidents/${id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/incidents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCIDENT_QUERY_KEYS.all })
    },
  })
}
