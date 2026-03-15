import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  LeaseAgreement,
  LeaseAgreementWithContract,
  LeaseAgreementListResponse,
  CreateLeaseAgreementRequest,
  UpdateLeaseAgreementRequest,
} from '@thanamol/shared'

export type LeaseAgreementQueryParams = {
  page?: number
  limit?: number
  contractId?: string
  status?: string
}

function buildQueryString(params: LeaseAgreementQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.contractId) query.set('contractId', params.contractId)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const LEASE_AGREEMENT_QUERY_KEYS = {
  all: ['lease-agreements'] as const,
  list: (params: LeaseAgreementQueryParams) => ['lease-agreements', 'list', params] as const,
  detail: (id: string) => ['lease-agreements', id] as const,
}

export function useLeaseAgreements(params: LeaseAgreementQueryParams = {}) {
  return useQuery({
    queryKey: LEASE_AGREEMENT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<LeaseAgreementListResponse>(`/lease-agreements${buildQueryString(params)}`),
  })
}

export function useLeaseAgreementById(id: string) {
  return useQuery({
    queryKey: LEASE_AGREEMENT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ leaseAgreement: LeaseAgreementWithContract }>(`/lease-agreements/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateLeaseAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLeaseAgreementRequest) =>
      apiPost<{ leaseAgreement: LeaseAgreement }>('/lease-agreements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEASE_AGREEMENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateLeaseAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaseAgreementRequest }) =>
      apiPut<{ leaseAgreement: LeaseAgreement }>(`/lease-agreements/${id}`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: LEASE_AGREEMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: LEASE_AGREEMENT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteLeaseAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/lease-agreements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEASE_AGREEMENT_QUERY_KEYS.all })
    },
  })
}
