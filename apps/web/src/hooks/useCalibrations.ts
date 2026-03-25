import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CalibrationListResponse,
  CalibrationWithAsset,
  CreateCalibrationRequest,
  UpdateCalibrationRequest,
  CalibrationQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const CALIBRATION_QUERY_KEYS = {
  all: ['calibrations'] as const,
  list: (params: CalibrationQueryParams) => ['calibrations', 'list', params] as const,
  detail: (id: string) => ['calibrations', id] as const,
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

export function useCalibrations(params: CalibrationQueryParams = {}) {
  return useQuery({
    queryKey: CALIBRATION_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<CalibrationListResponse>(
        `/fms/calibrations${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useCalibration(id: string) {
  return useQuery({
    queryKey: CALIBRATION_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ calibration: CalibrationWithAsset }>(`/fms/calibrations/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateCalibration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCalibrationRequest) =>
      apiPost<{ calibration: CalibrationWithAsset }>('/fms/calibrations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALIBRATION_QUERY_KEYS.all })
    },
  })
}

export function useUpdateCalibration(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCalibrationRequest) =>
      apiPut<{ calibration: CalibrationWithAsset }>(`/fms/calibrations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALIBRATION_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CALIBRATION_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteCalibration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/calibrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALIBRATION_QUERY_KEYS.all })
    },
  })
}
