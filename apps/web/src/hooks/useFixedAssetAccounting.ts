import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'

export const FA_QUERY_KEYS = {
  register: (params: Record<string, unknown>) => ['fixed-assets', 'register', params] as const,
  depreciation: (assetId: string) => ['fixed-assets', 'depreciation', assetId] as const,
  disposals: ['asset-disposals'] as const,
  transfers: ['asset-transfers'] as const,
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

export function useFixedAssetRegister(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: FA_QUERY_KEYS.register(params),
    queryFn: () => apiGet<any>(`/finance/fixed-assets/register${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useAssetDepreciation(assetId: string) {
  return useQuery({
    queryKey: FA_QUERY_KEYS.depreciation(assetId),
    queryFn: () => apiGet<any>(`/finance/fixed-assets/depreciation/${assetId}`),
    enabled: Boolean(assetId),
  })
}

export function useCalculateDepreciation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (period: string) => apiPost<any>('/finance/fixed-assets/depreciation/calculate', { period }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed-assets'] }) },
  })
}

export function usePostDepreciation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (period: string) => apiPost<any>('/finance/fixed-assets/depreciation/post', { period }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed-assets'] }) },
  })
}

export function useAssetDisposals(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [...FA_QUERY_KEYS.disposals, params],
    queryFn: () => apiGet<any>(`/finance/asset-disposals${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useCreateAssetDisposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiPost<any>('/finance/asset-disposals', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: FA_QUERY_KEYS.disposals }) },
  })
}

export function useAssetTransfers(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [...FA_QUERY_KEYS.transfers, params],
    queryFn: () => apiGet<any>(`/finance/asset-transfers${buildQueryString(params)}`),
    staleTime: 30 * 1000,
  })
}

export function useCreateAssetTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiPost<any>('/finance/asset-transfers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: FA_QUERY_KEYS.transfers }) },
  })
}
