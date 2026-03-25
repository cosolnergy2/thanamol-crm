import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  StockMovementListResponse,
  StockMovementWithRelations,
  CreateStockMovementRequest,
} from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'
import { INVENTORY_QUERY_KEYS } from './useInventory'

export const STOCK_MOVEMENT_QUERY_KEYS = {
  all: ['stock-movements'] as const,
  list: (params: Record<string, unknown>) => ['stock-movements', 'list', params] as const,
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

export function useStockMovements(
  params: {
    itemId?: string
    movementType?: string
    page?: number
    limit?: number
  } = {}
) {
  return useQuery({
    queryKey: STOCK_MOVEMENT_QUERY_KEYS.list(params as Record<string, unknown>),
    queryFn: () =>
      apiGet<StockMovementListResponse>(
        `/fms/stock-movements${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockMovementRequest) =>
      apiPost<{ movement: StockMovementWithRelations }>('/fms/stock-movements', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENT_QUERY_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.detail(variables.itemId),
      })
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.all })
    },
  })
}
