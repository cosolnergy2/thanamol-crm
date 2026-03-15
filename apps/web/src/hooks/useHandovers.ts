import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  HandoverListResponse,
  Handover,
  CreateHandoverRequest,
  UpdateHandoverRequest,
} from '@thanamol/shared'

type HandoverQueryParams = {
  page?: number
  limit?: number
  contractId?: string
  status?: string
}

function buildHandoverQueryString(params: HandoverQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.contractId) query.set('contractId', params.contractId)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useHandovers(params: HandoverQueryParams = {}) {
  return useQuery({
    queryKey: ['handovers', params],
    queryFn: () =>
      apiGet<HandoverListResponse>(`/handovers${buildHandoverQueryString(params)}`),
  })
}

export function useHandoverById(id: string) {
  return useQuery({
    queryKey: ['handovers', id],
    queryFn: () => apiGet<Handover>(`/handovers/${id}`),
    enabled: !!id,
  })
}

export function useCreateHandover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHandoverRequest) => apiPost<Handover>('/handovers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handovers'] })
    },
  })
}

export function useUpdateHandover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHandoverRequest }) =>
      apiPut<Handover>(`/handovers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handovers'] })
    },
  })
}

export function useDeleteHandover() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/handovers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handovers'] })
    },
  })
}
