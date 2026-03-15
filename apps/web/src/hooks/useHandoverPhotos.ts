import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  HandoverPhotosListResponse,
  HandoverPhotos,
  CreateHandoverPhotosRequest,
  UpdateHandoverPhotosRequest,
} from '@thanamol/shared'

type HandoverPhotosQueryParams = {
  page?: number
  limit?: number
  handoverId?: string
}

function buildHandoverPhotosQueryString(params: HandoverPhotosQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.handoverId) query.set('handoverId', params.handoverId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useHandoverPhotos(params: HandoverPhotosQueryParams = {}) {
  return useQuery({
    queryKey: ['handover-photos', params],
    queryFn: () =>
      apiGet<HandoverPhotosListResponse>(
        `/handover-photos${buildHandoverPhotosQueryString(params)}`,
      ),
  })
}

export function useHandoverPhotosById(id: string) {
  return useQuery({
    queryKey: ['handover-photos', id],
    queryFn: () => apiGet<HandoverPhotos>(`/handover-photos/${id}`),
    enabled: !!id,
  })
}

export function useCreateHandoverPhotos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHandoverPhotosRequest) =>
      apiPost<HandoverPhotos>('/handover-photos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-photos'] })
    },
  })
}

export function useUpdateHandoverPhotos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHandoverPhotosRequest }) =>
      apiPut<HandoverPhotos>(`/handover-photos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-photos'] })
    },
  })
}

export function useDeleteHandoverPhotos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/handover-photos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-photos'] })
    },
  })
}
