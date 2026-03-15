import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  MeterRecord,
  MeterRecordWithUnit,
  MeterRecordListResponse,
  MeterRecordQueryParams,
  CreateMeterRecordRequest,
  UpdateMeterRecordRequest,
} from '@thanamol/shared'

function buildMeterRecordQueryString(params: MeterRecordQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.unitId) query.set('unitId', params.unitId)
  if (params.meterType) query.set('meterType', params.meterType)
  if (params.billingPeriod) query.set('billingPeriod', params.billingPeriod)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const METER_RECORD_QUERY_KEYS = {
  all: ['meter-records'] as const,
  list: (params: MeterRecordQueryParams) => ['meter-records', 'list', params] as const,
  detail: (id: string) => ['meter-records', 'detail', id] as const,
}

export function useMeterRecords(params: MeterRecordQueryParams = {}) {
  return useQuery({
    queryKey: METER_RECORD_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<MeterRecordListResponse>(`/meter-records${buildMeterRecordQueryString(params)}`),
  })
}

export function useMeterRecordById(id: string) {
  return useQuery({
    queryKey: METER_RECORD_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ meterRecord: MeterRecordWithUnit }>(`/meter-records/${id}`),
    enabled: !!id,
  })
}

export function useCreateMeterRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeterRecordRequest) =>
      apiPost<{ meterRecord: MeterRecord }>('/meter-records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_RECORD_QUERY_KEYS.all })
    },
  })
}

export function useUpdateMeterRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMeterRecordRequest }) =>
      apiPut<{ meterRecord: MeterRecord }>(`/meter-records/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: METER_RECORD_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: METER_RECORD_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteMeterRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/meter-records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_RECORD_QUERY_KEYS.all })
    },
  })
}
