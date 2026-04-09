import { useQuery } from '@tanstack/react-query'
import type {
  TrialBalanceResponse,
  BalanceSheetResponse,
  ProfitLossResponse,
  GeneralLedgerResponse,
  AccountingDashboardData,
} from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'

export function useTrialBalance(periodFrom?: string, periodTo?: string) {
  const params = new URLSearchParams()
  if (periodFrom) params.set('periodFrom', periodFrom)
  if (periodTo) params.set('periodTo', periodTo)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['accounting-reports', 'trial-balance', periodFrom, periodTo],
    queryFn: () => apiGet<TrialBalanceResponse>(`/finance/reports/trial-balance${qs}`),
    staleTime: 60 * 1000,
  })
}

export function useBalanceSheet(asOfDate?: string) {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : ''
  return useQuery({
    queryKey: ['accounting-reports', 'balance-sheet', asOfDate],
    queryFn: () => apiGet<BalanceSheetResponse>(`/finance/reports/balance-sheet${qs}`),
    staleTime: 60 * 1000,
  })
}

export function useProfitLoss(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['accounting-reports', 'profit-loss', dateFrom, dateTo],
    queryFn: () => apiGet<ProfitLossResponse>(`/finance/reports/profit-loss${qs}`),
    staleTime: 60 * 1000,
  })
}

export function useGeneralLedger(accountCode?: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams()
  if (accountCode) params.set('accountCode', accountCode)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['accounting-reports', 'general-ledger', accountCode, dateFrom, dateTo],
    queryFn: () => apiGet<GeneralLedgerResponse>(`/finance/reports/general-ledger${qs}`),
    enabled: Boolean(accountCode),
    staleTime: 60 * 1000,
  })
}

export function useAccountingDashboard() {
  return useQuery({
    queryKey: ['accounting-dashboard'],
    queryFn: () => apiGet<AccountingDashboardData>('/finance/accounting-dashboard'),
    staleTime: 30 * 1000,
  })
}
