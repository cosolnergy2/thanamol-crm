import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PRListResponse,
  PurchaseRequestWithRelations,
  CreatePRRequest,
  UpdatePRRequest,
  PRQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const PR_QUERY_KEYS = {
  all: ['purchase-requests'] as const,
  list: (params: PRQueryParams) => ['purchase-requests', 'list', params] as const,
  detail: (id: string) => ['purchase-requests', id] as const,
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

export function usePurchaseRequests(params: PRQueryParams = {}) {
  return useQuery({
    queryKey: PR_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<PRListResponse>(
        `/fms/purchase-requests${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function usePurchaseRequest(id: string) {
  return useQuery({
    queryKey: PR_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{
        pr: PurchaseRequestWithRelations & {
          purchase_orders: Array<{
            id: string
            po_number: string
            status: string
            total: number
            created_at: string
          }>
          vendor_quotations: Array<{
            id: string
            quotation_number: string | null
            vendor_name: string
            total: number
            is_selected: boolean
          }>
        }
      }>(`/fms/purchase-requests/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePRRequest) =>
      apiPost<{ pr: PurchaseRequestWithRelations }>('/fms/purchase-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePurchaseRequest(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePRRequest) =>
      apiPut<{ pr: PurchaseRequestWithRelations }>(`/fms/purchase-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeletePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/purchase-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
    },
  })
}

export function useSubmitPurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ pr: PurchaseRequestWithRelations }>(`/fms/purchase-requests/${id}/submit`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useApprovePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy?: string }) =>
      apiPost<{ pr: PurchaseRequestWithRelations }>(`/fms/purchase-requests/${id}/approve`, {
        approvedBy,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useRejectPurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPost<{ pr: PurchaseRequestWithRelations }>(`/fms/purchase-requests/${id}/reject`, {
        reason,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useConvertPRtoPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      vendorName,
      paymentTerms,
      deliveryDate,
    }: {
      id: string
      vendorName?: string
      paymentTerms?: string
      deliveryDate?: string
    }) =>
      apiPost<{ pr: PurchaseRequestWithRelations; po: unknown }>(
        `/fms/purchase-requests/${id}/convert`,
        { vendorName, paymentTerms, deliveryDate }
      ),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PR_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
