import { useQuery } from '@tanstack/react-query'
import type {
  FMSMaintenanceCostReport,
  FMSAssetStatusReport,
  FMSBudgetVarianceReport,
  FMSComplianceStatusReport,
  FMSBudgetOverviewReport,
  FMSBudgetVsActualReport,
  FMSCostReport,
} from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'

export const FMS_REPORTS_QUERY_KEYS = {
  maintenanceCost: (params: MaintenanceCostParams) =>
    ['fms-reports', 'maintenance-cost', params] as const,
  assetStatus: (projectId: string) => ['fms-reports', 'asset-status', projectId] as const,
  budgetVariance: (params: BudgetVarianceParams) =>
    ['fms-reports', 'budget-variance', params] as const,
  complianceStatus: (projectId: string) =>
    ['fms-reports', 'compliance-status', projectId] as const,
  budgetOverview: (fiscalYear?: number) =>
    ['fms-reports', 'budget-overview', fiscalYear] as const,
  budgetVsActual: (fiscalYear?: number) =>
    ['fms-reports', 'budget-vs-actual', fiscalYear] as const,
  costReport: (fiscalYear?: number) => ['fms-reports', 'cost-report', fiscalYear] as const,
}

export type MaintenanceCostParams = {
  projectId: string
  startDate?: string
  endDate?: string
}

export type BudgetVarianceParams = {
  projectId: string
  fiscalYear?: number
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

export function useFMSMaintenanceCostReport(params: MaintenanceCostParams) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.maintenanceCost(params),
    queryFn: () =>
      apiGet<{ report: FMSMaintenanceCostReport }>(
        `/fms/reports/maintenance-cost${buildQueryString(params as Record<string, unknown>)}`
      ),
    enabled: Boolean(params.projectId),
    staleTime: 60 * 1000,
  })
}

export function useFMSAssetStatusReport(projectId: string) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.assetStatus(projectId),
    queryFn: () =>
      apiGet<{ report: FMSAssetStatusReport }>(
        `/fms/reports/asset-status${buildQueryString({ projectId })}`
      ),
    enabled: Boolean(projectId),
    staleTime: 60 * 1000,
  })
}

export function useFMSBudgetVarianceReport(params: BudgetVarianceParams) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.budgetVariance(params),
    queryFn: () =>
      apiGet<{ report: FMSBudgetVarianceReport }>(
        `/fms/reports/budget-variance${buildQueryString(params as Record<string, unknown>)}`
      ),
    enabled: Boolean(params.projectId),
    staleTime: 60 * 1000,
  })
}

export function useFMSComplianceStatusReport(projectId: string) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.complianceStatus(projectId),
    queryFn: () =>
      apiGet<{ report: FMSComplianceStatusReport }>(
        `/fms/reports/compliance-status${buildQueryString({ projectId })}`
      ),
    enabled: Boolean(projectId),
    staleTime: 60 * 1000,
  })
}

export function useFMSBudgetOverviewReport(fiscalYear?: number) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.budgetOverview(fiscalYear),
    queryFn: () =>
      apiGet<{ report: FMSBudgetOverviewReport }>(
        `/fms/reports/budget-overview${buildQueryString(fiscalYear ? { fiscalYear } : {})}`
      ),
    staleTime: 60 * 1000,
  })
}

export function useFMSBudgetVsActualReport(fiscalYear?: number) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.budgetVsActual(fiscalYear),
    queryFn: () =>
      apiGet<{ report: FMSBudgetVsActualReport }>(
        `/fms/reports/budget-vs-actual${buildQueryString(fiscalYear ? { fiscalYear } : {})}`
      ),
    staleTime: 60 * 1000,
  })
}

export function useFMSCostReport(fiscalYear?: number) {
  return useQuery({
    queryKey: FMS_REPORTS_QUERY_KEYS.costReport(fiscalYear),
    queryFn: () =>
      apiGet<{ report: FMSCostReport }>(
        `/fms/reports/cost-report${buildQueryString(fiscalYear ? { fiscalYear } : {})}`
      ),
    staleTime: 60 * 1000,
  })
}
