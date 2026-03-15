import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { ContractListResponse, ContractQueryParams } from '@thanamol/shared'

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
}

export function useContracts(params: ContractQueryParams = {}) {
  return useQuery({
    queryKey: CONTRACT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ContractListResponse>(`/contracts${buildContractQueryString(params)}`),
  })
}
