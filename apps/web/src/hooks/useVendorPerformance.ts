import { useQuery } from '@tanstack/react-query'
import type { VendorPerformance, VendorPriceTrend } from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'

export const VENDOR_PERFORMANCE_QUERY_KEYS = {
  performance: (id: string) => ['vendors', id, 'performance'] as const,
  priceTrend: (id: string) => ['vendors', id, 'price-trend'] as const,
}

export function useVendorPerformance(vendorId: string) {
  return useQuery({
    queryKey: VENDOR_PERFORMANCE_QUERY_KEYS.performance(vendorId),
    queryFn: () =>
      apiGet<{ performance: VendorPerformance }>(`/fms/vendors/${vendorId}/performance`),
    enabled: Boolean(vendorId),
    staleTime: 60 * 1000,
  })
}

export function useVendorPriceTrend(vendorId: string) {
  return useQuery({
    queryKey: VENDOR_PERFORMANCE_QUERY_KEYS.priceTrend(vendorId),
    queryFn: () => apiGet<{ trend: VendorPriceTrend }>(`/fms/vendors/${vendorId}/price-trend`),
    enabled: Boolean(vendorId),
    staleTime: 60 * 1000,
  })
}
