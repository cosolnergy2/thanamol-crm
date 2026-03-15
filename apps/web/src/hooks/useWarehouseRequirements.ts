import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  WarehouseRequirementListResponse,
  WarehouseRequirement,
  CreateWarehouseRequirementRequest,
  UpdateWarehouseRequirementRequest,
  WarehouseRequirementQueryParams,
} from '@thanamol/shared'

function buildQueryString(params: WarehouseRequirementQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.projectId) query.set('projectId', params.projectId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useWarehouseRequirements(params: WarehouseRequirementQueryParams = {}) {
  return useQuery({
    queryKey: ['warehouse-requirements', params],
    queryFn: () =>
      apiGet<WarehouseRequirementListResponse>(
        `/warehouse-requirements${buildQueryString(params)}`,
      ),
  })
}

export function useWarehouseRequirement(id: string) {
  return useQuery({
    queryKey: ['warehouse-requirements', id],
    queryFn: () => apiGet<WarehouseRequirement>(`/warehouse-requirements/${id}`),
    enabled: !!id,
  })
}

export function useCreateWarehouseRequirement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWarehouseRequirementRequest) =>
      apiPost<WarehouseRequirement>('/warehouse-requirements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-requirements'] })
    },
  })
}

export function useUpdateWarehouseRequirement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWarehouseRequirementRequest }) =>
      apiPut<WarehouseRequirement>(`/warehouse-requirements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-requirements'] })
    },
  })
}

export function useDeleteWarehouseRequirement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ message: string }>(`/warehouse-requirements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-requirements'] })
    },
  })
}
