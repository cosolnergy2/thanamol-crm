import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type {
  SalesReportResponse,
  RevenueReportResponse,
  OccupancyReportResponse,
  CollectionReportResponse,
} from '@thanamol/shared'

type ReportPeriodParams = {
  from?: string
  to?: string
}

function buildPeriodQueryString(params: ReportPeriodParams): string {
  const query = new URLSearchParams()
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useSalesReport(params: ReportPeriodParams = {}) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () =>
      apiGet<SalesReportResponse>(`/reports/sales${buildPeriodQueryString(params)}`),
  })
}

export function useRevenueReport(params: ReportPeriodParams = {}) {
  return useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: () =>
      apiGet<RevenueReportResponse>(`/reports/revenue${buildPeriodQueryString(params)}`),
  })
}

export function useOccupancyReport() {
  return useQuery({
    queryKey: ['reports', 'occupancy'],
    queryFn: () => apiGet<OccupancyReportResponse>('/reports/occupancy'),
  })
}

export function useCollectionReport(params: ReportPeriodParams = {}) {
  return useQuery({
    queryKey: ['reports', 'collection', params],
    queryFn: () =>
      apiGet<CollectionReportResponse>(`/reports/collection${buildPeriodQueryString(params)}`),
  })
}
