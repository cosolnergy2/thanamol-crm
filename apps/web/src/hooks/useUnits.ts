import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UnitListResponse,
  UnitWithProject,
  CreateUnitRequest,
  UpdateUnitRequest,
  UnitAvailabilityByProject,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export type UnitFilters = {
  projectId?: string
  status?: string
  type?: string
  floor?: number
  search?: string
  minArea?: number
  maxArea?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

function buildUnitQueryString(filters: UnitFilters): string {
  const params = new URLSearchParams()
  if (filters.projectId) params.set('projectId', filters.projectId)
  if (filters.status) params.set('status', filters.status)
  if (filters.type) params.set('type', filters.type)
  if (filters.floor !== undefined) params.set('floor', String(filters.floor))
  if (filters.search) params.set('search', filters.search)
  if (filters.minArea !== undefined) params.set('minArea', String(filters.minArea))
  if (filters.maxArea !== undefined) params.set('maxArea', String(filters.maxArea))
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useUnits(filters: UnitFilters = {}) {
  return useQuery({
    queryKey: ['units', filters],
    queryFn: () => apiGet<UnitListResponse>(`/units${buildUnitQueryString(filters)}`),
  })
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: () => apiGet<{ unit: UnitWithProject }>(`/units/${id}`),
    enabled: Boolean(id),
  })
}

export function useUnitAvailability(projectId?: string) {
  return useQuery({
    queryKey: ['units', 'availability', projectId],
    queryFn: () => {
      const qs = projectId ? `?projectId=${projectId}` : ''
      return apiGet<{ availability: UnitAvailabilityByProject[] }>(`/units/availability${qs}`)
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUnitRequest) => apiPost<{ unit: UnitWithProject }>('/units', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitRequest }) =>
      apiPut<{ unit: UnitWithProject }>(`/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ unit: UnitWithProject }>(`/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}
