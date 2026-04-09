import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'

export function useCFODashboard() {
  return useQuery({
    queryKey: ['cfo-dashboard'],
    queryFn: () => apiGet<any>('/finance/cfo-dashboard'),
    staleTime: 60 * 1000,
  })
}

export function useCashFlowAnalysis(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['cash-flow-analysis', dateFrom, dateTo],
    queryFn: () => apiGet<any>(`/finance/cash-flow/analysis${qs}`),
    staleTime: 60 * 1000,
  })
}
