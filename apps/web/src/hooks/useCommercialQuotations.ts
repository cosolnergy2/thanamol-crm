import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  CommercialQuotation,
  CommercialQuotationWithRelations,
  CommercialQuotationListResponse,
  CommercialQuotationQueryParams,
  CreateCommercialQuotationRequest,
  UpdateCommercialQuotationRequest,
  RejectCommercialQuotationRequest,
  PendingCommercialQuotationsResponse,
} from '@thanamol/shared'

export const COMMERCIAL_QUOTATION_QUERY_KEYS = {
  all: ['commercialQuotations'] as const,
  list: (params: CommercialQuotationQueryParams) =>
    ['commercialQuotations', params] as const,
  pending: () => ['commercialQuotations', 'pending'] as const,
  detail: (id: string) => ['commercialQuotation', id] as const,
}

function buildQueryString(params: CommercialQuotationQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.projectId) query.set('projectId', params.projectId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useCommercialQuotations(params: CommercialQuotationQueryParams = {}) {
  return useQuery({
    queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<CommercialQuotationListResponse>(
        `/commercial-quotations${buildQueryString(params)}`
      ),
  })
}

export function usePendingCommercialQuotations() {
  return useQuery({
    queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.pending(),
    queryFn: () =>
      apiGet<PendingCommercialQuotationsResponse>('/commercial-quotations/pending'),
  })
}

export function useCommercialQuotation(id: string) {
  return useQuery({
    queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ quotation: CommercialQuotationWithRelations }>(`/commercial-quotations/${id}`),
    enabled: !!id,
  })
}

export function useCreateCommercialQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCommercialQuotationRequest) =>
      apiPost<{ quotation: CommercialQuotation }>('/commercial-quotations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.all })
    },
  })
}

export function useUpdateCommercialQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCommercialQuotationRequest }) =>
      apiPut<{ quotation: CommercialQuotation }>(`/commercial-quotations/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.detail(id),
      })
    },
  })
}

export function useDeleteCommercialQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/commercial-quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.all })
    },
  })
}

export function useApproveCommercialQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ quotation: CommercialQuotation }>(`/commercial-quotations/${id}/approve`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.pending(),
      })
    },
  })
}

export function useRejectCommercialQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectCommercialQuotationRequest }) =>
      apiPost<{ quotation: CommercialQuotation; reason: string }>(
        `/commercial-quotations/${id}/reject`,
        data
      ),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: COMMERCIAL_QUOTATION_QUERY_KEYS.pending(),
      })
    },
  })
}
