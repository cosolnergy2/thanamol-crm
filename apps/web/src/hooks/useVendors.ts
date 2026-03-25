import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  VendorListResponse,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const VENDOR_QUERY_KEYS = {
  all: ['vendors'] as const,
  list: (params: VendorQueryParams) => ['vendors', 'list', params] as const,
  detail: (id: string) => ['vendors', id] as const,
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

export function useVendors(params: VendorQueryParams = {}) {
  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<VendorListResponse>(
        `/fms/vendors${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ vendor: Vendor & { contracts: unknown[]; item_prices: unknown[]; invoices: unknown[] } }>(`/fms/vendors/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVendorRequest) =>
      apiPost<{ vendor: Vendor }>('/fms/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.all })
    },
  })
}

export function useUpdateVendor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateVendorRequest) =>
      apiPut<{ vendor: Vendor }>(`/fms/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.all })
    },
  })
}
