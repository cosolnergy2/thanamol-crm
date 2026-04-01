import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  StockTransferListResponse,
  StockTransferWithRelations,
  CreateStockTransferRequest,
  StockTransferQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'
import { INVENTORY_QUERY_KEYS } from './useInventory'

export const STOCK_TRANSFER_QUERY_KEYS = {
  all: ['stock-transfers'] as const,
  list: (params: StockTransferQueryParams) => ['stock-transfers', 'list', params] as const,
  detail: (id: string) => ['stock-transfers', id] as const,
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

export function useStockTransfers(params: StockTransferQueryParams = {}) {
  return useQuery({
    queryKey: STOCK_TRANSFER_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<StockTransferListResponse>(
        `/fms/stock-transfers${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useStockTransfer(id: string) {
  return useQuery({
    queryKey: STOCK_TRANSFER_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ transfer: StockTransferWithRelations }>(`/fms/stock-transfers/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateStockTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockTransferRequest) =>
      apiPost<{ transfer: StockTransferWithRelations }>('/fms/stock-transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_TRANSFER_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}
