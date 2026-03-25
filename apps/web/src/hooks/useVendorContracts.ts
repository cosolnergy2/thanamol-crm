import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  VendorContractListResponse,
  VendorContractWithRelations,
  CreateVendorContractRequest,
  UpdateVendorContractRequest,
  VendorContractQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const VENDOR_CONTRACT_QUERY_KEYS = {
  all: ['vendor-contracts'] as const,
  list: (params: VendorContractQueryParams) => ['vendor-contracts', 'list', params] as const,
  detail: (id: string) => ['vendor-contracts', id] as const,
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

export function useVendorContracts(params: VendorContractQueryParams = {}) {
  return useQuery({
    queryKey: VENDOR_CONTRACT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<VendorContractListResponse>(
        `/fms/vendor-contracts${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useVendorContract(id: string) {
  return useQuery({
    queryKey: VENDOR_CONTRACT_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ contract: VendorContractWithRelations }>(`/fms/vendor-contracts/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateVendorContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVendorContractRequest) =>
      apiPost<{ contract: VendorContractWithRelations }>('/fms/vendor-contracts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateVendorContract(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateVendorContractRequest) =>
      apiPut<{ contract: VendorContractWithRelations }>(`/fms/vendor-contracts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useActivateVendorContract(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPost<{ contract: VendorContractWithRelations }>(`/fms/vendor-contracts/${id}/activate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useTerminateVendorContract(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPost<{ contract: VendorContractWithRelations }>(`/fms/vendor-contracts/${id}/terminate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteVendorContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/fms/vendor-contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_CONTRACT_QUERY_KEYS.all })
    },
  })
}
