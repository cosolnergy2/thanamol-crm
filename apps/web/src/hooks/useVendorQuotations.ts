import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  VQListResponse,
  VendorQuotationWithRelations,
  CreateVQRequest,
  UpdateVQRequest,
  VQQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const VQ_QUERY_KEYS = {
  all: ['vendor-quotations'] as const,
  list: (params: VQQueryParams) => ['vendor-quotations', 'list', params] as const,
  detail: (id: string) => ['vendor-quotations', id] as const,
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export function useVendorQuotations(params: VQQueryParams = {}) {
  return useQuery({
    queryKey: VQ_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<VQListResponse>(
        `/fms/vendor-quotations${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useVendorQuotation(id: string) {
  return useQuery({
    queryKey: VQ_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ quotation: VendorQuotationWithRelations }>(`/fms/vendor-quotations/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateVendorQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVQRequest) =>
      apiPost<{ quotation: VendorQuotationWithRelations }>('/fms/vendor-quotations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VQ_QUERY_KEYS.all })
    },
  })
}

export function useUpdateVendorQuotation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateVQRequest) =>
      apiPut<{ quotation: VendorQuotationWithRelations }>(`/fms/vendor-quotations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VQ_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VQ_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteVendorQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/vendor-quotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VQ_QUERY_KEYS.all })
    },
  })
}

export function useSelectVendorQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ quotation: VendorQuotationWithRelations }>(
        `/fms/vendor-quotations/${id}/select`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VQ_QUERY_KEYS.all })
    },
  })
}
