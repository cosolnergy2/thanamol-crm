import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Deal,
  DealListResponse,
  CreateDealRequest,
  UpdateDealRequest,
  PipelineStageGroup,
} from '@thanamol/shared'

type DealQueryParams = {
  page?: number
  limit?: number
  stage?: string
  assignedTo?: string
}

function buildDealQueryString(params: DealQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.stage && params.stage !== 'all') query.set('stage', params.stage)
  if (params.assignedTo && params.assignedTo !== 'all') query.set('assignedTo', params.assignedTo)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const DEAL_QUERY_KEYS = {
  all: ['deals'] as const,
  list: (params: DealQueryParams) => ['deals', 'list', params] as const,
  pipeline: ['deals', 'pipeline'] as const,
  detail: (id: string) => ['deals', id] as const,
}

export function useDeals(params: DealQueryParams = {}) {
  return useQuery({
    queryKey: DEAL_QUERY_KEYS.list(params),
    queryFn: () => apiGet<DealListResponse>(`/deals${buildDealQueryString(params)}`),
  })
}

export function useDealPipeline() {
  return useQuery({
    queryKey: DEAL_QUERY_KEYS.pipeline,
    queryFn: () => apiGet<{ pipeline: PipelineStageGroup[] }>('/deals/pipeline'),
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: DEAL_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ deal: Deal }>(`/deals/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDealRequest) => apiPost<{ deal: Deal }>('/deals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all })
    },
  })
}

export function useUpdateDeal(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateDealRequest) => apiPut<{ deal: Deal }>(`/deals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/deals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all })
    },
  })
}
