import { useQuery } from '@tanstack/react-query'
import type { VendorSummaryReport, ThreeWayMatch } from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'

export const VENDOR_REPORT_QUERY_KEYS = {
  summary: ['fms-reports', 'vendor-summary'] as const,
  threeWayMatch: (invoiceId: string) =>
    ['vendor-invoices', invoiceId, 'three-way-match'] as const,
}

export function useVendorSummaryReport() {
  return useQuery({
    queryKey: VENDOR_REPORT_QUERY_KEYS.summary,
    queryFn: () => apiGet<{ report: VendorSummaryReport }>('/fms/reports/vendor-summary'),
    staleTime: 60 * 1000,
  })
}

export function useThreeWayMatch(invoiceId: string) {
  return useQuery({
    queryKey: VENDOR_REPORT_QUERY_KEYS.threeWayMatch(invoiceId),
    queryFn: () =>
      apiGet<{ match: ThreeWayMatch }>(`/fms/vendor-invoices/${invoiceId}/three-way-match`),
    enabled: Boolean(invoiceId),
    staleTime: 60 * 1000,
  })
}
