import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  InsurancePolicyListResponse,
  InsurancePolicyWithRelations,
  CreateInsurancePolicyRequest,
  UpdateInsurancePolicyRequest,
  InsurancePolicyQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const INSURANCE_QUERY_KEYS = {
  all: ['insurance-policies'] as const,
  list: (params: InsurancePolicyQueryParams) => ['insurance-policies', 'list', params] as const,
  detail: (id: string) => ['insurance-policies', id] as const,
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

export function useInsurancePolicies(params: InsurancePolicyQueryParams = {}) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<InsurancePolicyListResponse>(
        `/fms/insurance-policies${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useInsurancePolicy(id: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ policy: InsurancePolicyWithRelations }>(`/fms/insurance-policies/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateInsurancePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInsurancePolicyRequest) =>
      apiPost<{ policy: InsurancePolicyWithRelations }>('/fms/insurance-policies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.all })
    },
  })
}

export function useUpdateInsurancePolicy(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateInsurancePolicyRequest) =>
      apiPut<{ policy: InsurancePolicyWithRelations }>(`/fms/insurance-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteInsurancePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/insurance-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.all })
    },
  })
}
