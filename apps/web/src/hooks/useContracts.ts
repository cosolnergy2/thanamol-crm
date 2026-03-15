import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Contract,
  ContractListResponse,
  ContractQueryParams,
  ContractStatus,
  ContractType,
} from '@thanamol/shared'

type CreateContractData = {
  customerId: string
  projectId: string
  unitId?: string
  quotationId?: string
  type?: ContractType
  startDate: string
  endDate?: string
  value?: number
  monthlyRent?: number
  depositAmount?: number
  terms?: string
  status?: ContractStatus
}

type UpdateContractData = Partial<CreateContractData>

function buildContractQueryString(params: ContractQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.type && params.type !== 'all') query.set('type', params.type)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.projectId) query.set('projectId', params.projectId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const CONTRACT_QUERY_KEYS = {
  all: ['contracts'] as const,
  list: (params: ContractQueryParams) => ['contracts', 'list', params] as const,
  detail: (id: string) => ['contracts', 'detail', id] as const,
  pending: ['contracts', 'pending'] as const,
  expiring: (days: number) => ['contracts', 'expiring', days] as const,
}

export function useContracts(params: ContractQueryParams = {}) {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ContractListResponse>(`/contracts${buildContractQueryString(params)}`),
  })
}

export function useContractById(id: string) {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ contract: Contract }>(`/contracts/${id}`),
    enabled: !!id,
  })
}

export function usePendingContracts() {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.pending,
    queryFn: () => apiGet<{ contracts: Contract[] }>('/contracts/pending'),
  })
}

export function useExpiringContracts(days = 30) {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.expiring(days),
    queryFn: () => apiGet<{ data: Contract[]; total: number }>(`/contracts/expiring?days=${days}`),
  })
}

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContractData) =>
      apiPost<{ contract: Contract }>('/contracts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractData }) =>
      apiPut<{ contract: Contract }>(`/contracts/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all })
    },
  })
}

export function useApproveContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<{ contract: Contract }>(`/contracts/${id}/approve`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useRejectContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      apiPost<{ contract: Contract }>(`/contracts/${id}/reject`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}
