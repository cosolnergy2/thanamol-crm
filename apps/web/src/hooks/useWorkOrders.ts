import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  WorkOrderListResponse,
  WorkOrderWithRelations,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  WorkOrderQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client'

export const WO_QUERY_KEYS = {
  all: ['work-orders'] as const,
  list: (params: WorkOrderQueryParams) => ['work-orders', 'list', params] as const,
  detail: (id: string) => ['work-orders', id] as const,
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

export function useWorkOrders(params: WorkOrderQueryParams = {}) {
  return useQuery({
    queryKey: WO_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<WorkOrderListResponse>(
        `/fms/work-orders${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: WO_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ workOrder: WorkOrderWithRelations & { pm_logs: unknown[] } }>(
        `/fms/work-orders/${id}`
      ),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkOrderRequest) =>
      apiPost<{ workOrder: WorkOrderWithRelations }>('/fms/work-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
    },
  })
}

export function useUpdateWorkOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateWorkOrderRequest) =>
      apiPut<{ workOrder: WorkOrderWithRelations }>(`/fms/work-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useAssignWorkOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignedTo: string) =>
      apiPatch<{ workOrder: WorkOrderWithRelations }>(`/fms/work-orders/${id}/assign`, {
        assignedTo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useStartWorkOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ workOrder: WorkOrderWithRelations }>(`/fms/work-orders/${id}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCompleteWorkOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      completionNotes?: string
      actualHours?: number
      actualCost?: number
      partsUsed?: unknown[]
    }) =>
      apiPatch<{ workOrder: WorkOrderWithRelations }>(
        `/fms/work-orders/${id}/complete`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCancelWorkOrder(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) =>
      apiPatch<{ workOrder: WorkOrderWithRelations }>(`/fms/work-orders/${id}/cancel`, {
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteWorkOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/work-orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WO_QUERY_KEYS.all })
    },
  })
}
