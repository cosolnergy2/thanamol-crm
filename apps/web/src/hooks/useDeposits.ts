import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Deposit,
  DepositWithRelations,
  DepositListResponse,
  DepositQueryParams,
  CreateDepositRequest,
  UpdateDepositRequest,
} from '@thanamol/shared'

function buildDepositQueryString(params: DepositQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.contractId) query.set('contractId', params.contractId)
  if (params.customerId) query.set('customerId', params.customerId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const DEPOSIT_QUERY_KEYS = {
  all: ['deposits'] as const,
  list: (params: DepositQueryParams) => ['deposits', 'list', params] as const,
  detail: (id: string) => ['deposits', 'detail', id] as const,
}

export function useDeposits(params: DepositQueryParams = {}) {
  return useQuery({
    queryKey: DEPOSIT_QUERY_KEYS.list(params),
    queryFn: () => apiGet<DepositListResponse>(`/deposits${buildDepositQueryString(params)}`),
  })
}

export function useDepositById(id: string) {
  return useQuery({
    queryKey: DEPOSIT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ deposit: DepositWithRelations }>(`/deposits/${id}`),
    enabled: !!id,
  })
}

export function useCreateDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDepositRequest) => apiPost<{ deposit: Deposit }>('/deposits', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepositRequest }) =>
      apiPut<{ deposit: Deposit }>(`/deposits/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: DEPOSIT_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/deposits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPOSIT_QUERY_KEYS.all })
    },
  })
}
