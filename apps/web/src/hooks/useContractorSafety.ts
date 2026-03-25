import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ContractorSafetyListResponse,
  ContractorSafetyWithRelations,
  CreateContractorSafetyRequest,
  UpdateContractorSafetyRequest,
  ContractorSafetyQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'

export const CONTRACTOR_QUERY_KEYS = {
  all: ['contractor-safety'] as const,
  list: (params: ContractorSafetyQueryParams) => ['contractor-safety', 'list', params] as const,
  detail: (id: string) => ['contractor-safety', id] as const,
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

export function useContractorSafetyRecords(params: ContractorSafetyQueryParams = {}) {
  return useQuery({
    queryKey: CONTRACTOR_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ContractorSafetyListResponse>(
        `/fms/contractor-safety${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useContractorSafetyRecord(id: string) {
  return useQuery({
    queryKey: CONTRACTOR_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ contractor: ContractorSafetyWithRelations }>(`/fms/contractor-safety/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateContractorSafety() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContractorSafetyRequest) =>
      apiPost<{ contractor: ContractorSafetyWithRelations }>('/fms/contractor-safety', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.all })
    },
  })
}

export function useUpdateContractorSafety(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateContractorSafetyRequest) =>
      apiPut<{ contractor: ContractorSafetyWithRelations }>(`/fms/contractor-safety/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useToggleContractorClearance(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ contractor: ContractorSafetyWithRelations }>(
        `/fms/contractor-safety/${id}/toggle-clearance`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteContractorSafety() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/contractor-safety/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTOR_QUERY_KEYS.all })
    },
  })
}
