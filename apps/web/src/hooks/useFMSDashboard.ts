import { useQuery } from '@tanstack/react-query'
import type { FMSDashboardSummary, FMSRecentActivity } from '@thanamol/shared'
import { apiGet } from '@/lib/api-client'

export const FMS_DASHBOARD_QUERY_KEYS = {
  summary: (projectId?: string) => ['fms-dashboard', 'summary', projectId] as const,
  recentActivity: (projectId?: string, limit?: number) =>
    ['fms-dashboard', 'recent-activity', projectId, limit] as const,
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

export function useFMSDashboardSummary(projectId?: string) {
  return useQuery({
    queryKey: FMS_DASHBOARD_QUERY_KEYS.summary(projectId),
    queryFn: () =>
      apiGet<{ summary: FMSDashboardSummary }>(
        `/fms/dashboard/summary${buildQueryString({ projectId })}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useFMSRecentActivity(projectId?: string, limit: number = 10) {
  return useQuery({
    queryKey: FMS_DASHBOARD_QUERY_KEYS.recentActivity(projectId, limit),
    queryFn: () =>
      apiGet<{ activity: FMSRecentActivity }>(
        `/fms/dashboard/recent-activity${buildQueryString({ projectId, limit })}`
      ),
    staleTime: 30 * 1000,
  })
}
