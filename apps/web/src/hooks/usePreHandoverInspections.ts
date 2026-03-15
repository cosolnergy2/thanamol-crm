import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  PreHandoverInspection,
  PreHandoverInspectionWithContract,
  PreHandoverInspectionListResponse,
  CreatePreHandoverInspectionRequest,
  UpdatePreHandoverInspectionRequest,
} from '@thanamol/shared'

export type PreHandoverInspectionQueryParams = {
  page?: number
  limit?: number
  contractId?: string
  status?: string
}

function buildQueryString(params: PreHandoverInspectionQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.contractId) query.set('contractId', params.contractId)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const PRE_HANDOVER_QUERY_KEYS = {
  all: ['pre-handover-inspections'] as const,
  list: (params: PreHandoverInspectionQueryParams) =>
    ['pre-handover-inspections', 'list', params] as const,
  detail: (id: string) => ['pre-handover-inspections', id] as const,
}

export function usePreHandoverInspections(params: PreHandoverInspectionQueryParams = {}) {
  return useQuery({
    queryKey: PRE_HANDOVER_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<PreHandoverInspectionListResponse>(
        `/pre-handover-inspections${buildQueryString(params)}`,
      ),
  })
}

export function usePreHandoverInspectionById(id: string) {
  return useQuery({
    queryKey: PRE_HANDOVER_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ inspection: PreHandoverInspectionWithContract }>(`/pre-handover-inspections/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreatePreHandoverInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePreHandoverInspectionRequest) =>
      apiPost<{ inspection: PreHandoverInspection }>('/pre-handover-inspections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRE_HANDOVER_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePreHandoverInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePreHandoverInspectionRequest }) =>
      apiPut<{ inspection: PreHandoverInspection }>(`/pre-handover-inspections/${id}`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: PRE_HANDOVER_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PRE_HANDOVER_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeletePreHandoverInspection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/pre-handover-inspections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRE_HANDOVER_QUERY_KEYS.all })
    },
  })
}
