import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  POListResponse,
  PurchaseOrderWithRelations,
  CreatePORequest,
  UpdatePORequest,
  POQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const PO_QUERY_KEYS = {
  all: ['purchase-orders'] as const,
  list: (params: POQueryParams) => ['purchase-orders', 'list', params] as const,
  detail: (id: string) => ['purchase-orders', id] as const,
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

export function usePurchaseOrders(params: POQueryParams = {}) {
  return useQuery({
    queryKey: PO_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<POListResponse>(
        `/fms/purchase-orders${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: PO_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePORequest) =>
      apiPost<{ po: PurchaseOrderWithRelations }>('/fms/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePurchaseOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePORequest) =>
      apiPut<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/purchase-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
    },
  })
}

export function useIssuePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}/issue`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, fullyReceived, notes }: { id: string; fullyReceived?: boolean; notes?: string }) =>
      apiPost<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}/receive`, {
        fullyReceived,
        notes,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPost<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}/cancel`, {
        reason,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ po: PurchaseOrderWithRelations }>(`/fms/purchase-orders/${id}/close`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEYS.detail(id) })
    },
  })
}
