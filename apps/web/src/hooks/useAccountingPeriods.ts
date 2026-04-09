import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountingPeriodWithUser } from '@thanamol/shared'
import { apiGet, apiPost } from '@/lib/api-client'

export const PERIOD_QUERY_KEYS = {
  all: ['accounting-periods'] as const,
  byYear: (year: number) => ['accounting-periods', year] as const,
}

export function useAccountingPeriods(year?: number) {
  const y = year ?? new Date().getFullYear()
  return useQuery({
    queryKey: PERIOD_QUERY_KEYS.byYear(y),
    queryFn: () =>
      apiGet<{ data: AccountingPeriodWithUser[]; year: number }>(
        `/finance/accounting-periods?year=${y}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useInitializeAccountingPeriods() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (year: number) =>
      apiPost<{ data: AccountingPeriodWithUser[]; count: number }>(
        '/finance/accounting-periods/initialize',
        { year }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERIOD_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePeriodStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPost<{ period: AccountingPeriodWithUser }>(
        `/finance/accounting-periods/${id}/status`,
        { status }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERIOD_QUERY_KEYS.all })
    },
  })
}
