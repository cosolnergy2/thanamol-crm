import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  FmsMeterReading,
  FmsMeterReadingListResponse,
  FmsMeterQueryParams,
  CreateFmsMeterReadingRequest,
  UpdateFmsMeterReadingRequest,
  UtilityRate,
  UtilityRateListResponse,
  CreateUtilityRateRequest,
  UpdateUtilityRateRequest,
  MeterRevenueResponse,
  EnergyReport,
  EnergyReportQueryParams,
} from '@thanamol/shared'

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const METER_QUERY_KEYS = {
  all: ['fms-meters'] as const,
  list: (params: FmsMeterQueryParams) => ['fms-meters', 'list', params] as const,
  detail: (id: string) => ['fms-meters', 'detail', id] as const,
  revenue: (params: FmsMeterQueryParams) => ['fms-meters', 'revenue', params] as const,
  rates: {
    all: ['fms-meter-rates'] as const,
    list: (params: { projectId?: string; meterType?: string }) =>
      ['fms-meter-rates', 'list', params] as const,
    detail: (id: string) => ['fms-meter-rates', 'detail', id] as const,
  },
  energy: (params: EnergyReportQueryParams) => ['fms-energy', params] as const,
}

export function useFmsMeterReadings(params: FmsMeterQueryParams = {}) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<FmsMeterReadingListResponse>(
        `/fms/meters${buildQueryString({
          projectId: params.projectId,
          meterType: params.meterType,
          page: params.page,
          limit: params.limit,
        })}`,
      ),
  })
}

export function useFmsMeterReading(id: string) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ meterReading: FmsMeterReading }>(`/fms/meters/${id}`),
    enabled: !!id,
  })
}

export function useCreateFmsMeterReading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFmsMeterReadingRequest) =>
      apiPost<{ meterReading: FmsMeterReading }>('/fms/meters', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.all })
    },
  })
}

export function useUpdateFmsMeterReading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFmsMeterReadingRequest }) =>
      apiPut<{ meterReading: FmsMeterReading }>(`/fms/meters/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.detail(variables.id) })
    },
  })
}

export function useDeleteFmsMeterReading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/meters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.all })
    },
  })
}

export function useMeterRevenue(params: FmsMeterQueryParams = {}) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.revenue(params),
    queryFn: () =>
      apiGet<MeterRevenueResponse>(
        `/fms/meters/revenue${buildQueryString({
          projectId: params.projectId,
          meterType: params.meterType,
        })}`,
      ),
    enabled: !!params.projectId,
  })
}

export function useUtilityRates(params: { projectId?: string; meterType?: string } = {}) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.rates.list(params),
    queryFn: () =>
      apiGet<UtilityRateListResponse>(
        `/fms/meters/rates${buildQueryString(params)}`,
      ),
  })
}

export function useUtilityRate(id: string) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.rates.detail(id),
    queryFn: () => apiGet<{ utilityRate: UtilityRate }>(`/fms/meters/rates/${id}`),
    enabled: !!id,
  })
}

export function useCreateUtilityRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUtilityRateRequest) =>
      apiPost<{ utilityRate: UtilityRate }>('/fms/meters/rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.rates.all })
    },
  })
}

export function useUpdateUtilityRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUtilityRateRequest }) =>
      apiPut<{ utilityRate: UtilityRate }>(`/fms/meters/rates/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.rates.all })
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.rates.detail(variables.id) })
    },
  })
}

export function useDeleteUtilityRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/meters/rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: METER_QUERY_KEYS.rates.all })
    },
  })
}

export function useEnergyReport(params: EnergyReportQueryParams = {}) {
  return useQuery({
    queryKey: METER_QUERY_KEYS.energy(params),
    queryFn: () =>
      apiGet<{ report: EnergyReport }>(
        `/fms/reports/energy${buildQueryString({
          projectId: params.projectId,
          startDate: params.startDate,
          endDate: params.endDate,
          periodType: params.periodType,
        })}`,
      ),
    enabled: !!params.projectId,
  })
}
