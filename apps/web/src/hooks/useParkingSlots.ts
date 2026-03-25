import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ParkingSlot,
  ParkingSlotListResponse,
  CreateParkingSlotRequest,
  UpdateParkingSlotRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api-client'

export const PARKING_SLOT_QUERY_KEYS = {
  all: ['parkingSlots'] as const,
  list: (params: ParkingSlotListParams) => ['parkingSlots', 'list', params] as const,
  detail: (id: string) => ['parkingSlots', id] as const,
}

export type ParkingSlotListParams = {
  projectId?: string
  status?: string
  zoneId?: string
  search?: string
  page?: number
  limit?: number
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

export function useParkingSlots(params: ParkingSlotListParams) {
  return useQuery({
    queryKey: PARKING_SLOT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ParkingSlotListResponse>(
        `/fms/parking-slots${buildQueryString(params as Record<string, unknown>)}`,
      ),
    staleTime: 30 * 1000,
  })
}

export function useParkingSlot(id: string) {
  return useQuery({
    queryKey: PARKING_SLOT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ parkingSlot: ParkingSlot }>(`/fms/parking-slots/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateParkingSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateParkingSlotRequest) =>
      apiPost<{ parkingSlot: ParkingSlot }>('/fms/parking-slots', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateParkingSlot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateParkingSlotRequest) =>
      apiPut<{ parkingSlot: ParkingSlot }>(`/fms/parking-slots/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useAssignParkingSlot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { unitId?: string; vehiclePlate?: string }) =>
      apiPatch<{ parkingSlot: ParkingSlot }>(`/fms/parking-slots/${id}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useReleaseParkingSlot(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPatch<{ parkingSlot: ParkingSlot }>(`/fms/parking-slots/${id}/release`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteParkingSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/parking-slots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_SLOT_QUERY_KEYS.all })
    },
  })
}
