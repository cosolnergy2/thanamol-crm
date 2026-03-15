import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  Quotation,
  QuotationWithRelations,
  QuotationListResponse,
  CreateQuotationRequest,
  UpdateQuotationRequest,
  RejectQuotationRequest,
} from '@thanamol/shared'

export type QuotationFilters = {
  page?: number
  limit?: number
  search?: string
  status?: string
  customerId?: string
  projectId?: string
}

function buildQuotationQueryString(filters: QuotationFilters): string {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.customerId) params.set('customerId', filters.customerId)
  if (filters.projectId) params.set('projectId', filters.projectId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const QUOTATION_QUERY_KEYS = {
  all: ['quotations'] as const,
  list: (filters: QuotationFilters) => ['quotations', 'list', filters] as const,
  pending: () => ['quotations', 'pending'] as const,
  detail: (id: string) => ['quotations', id] as const,
}

export function useQuotations(filters: QuotationFilters = {}) {
  return useQuery({
    queryKey: QUOTATION_QUERY_KEYS.list(filters),
    queryFn: () =>
      apiGet<QuotationListResponse>(`/quotations${buildQuotationQueryString(filters)}`),
  })
}

export function usePendingQuotations() {
  return useQuery({
    queryKey: QUOTATION_QUERY_KEYS.pending(),
    queryFn: () => apiGet<{ data: QuotationWithRelations[] }>('/quotations/pending'),
  })
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: QUOTATION_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ quotation: QuotationWithRelations }>(`/quotations/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateQuotationRequest) =>
      apiPost<{ quotation: Quotation }>('/quotations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.all })
    },
  })
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotationRequest }) =>
      apiPut<{ quotation: Quotation }>(`/quotations/${id}`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.all })
    },
  })
}

export function useApproveQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ quotation: Quotation }>(`/quotations/${id}/approve`),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.pending() })
    },
  })
}

export function useRejectQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectQuotationRequest }) =>
      apiPost<{ quotation: Quotation }>(`/quotations/${id}/reject`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEYS.pending() })
    },
  })
}
