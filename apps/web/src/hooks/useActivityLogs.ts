import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type {
  ActivityLogListResponse,
  UserAuditLogListResponse,
  ActivityLogQueryParams,
  AuditLogQueryParams,
} from '@thanamol/shared'

function buildActivityLogQueryString(params: ActivityLogQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.userId) query.set('userId', params.userId)
  if (params.entityType) query.set('entityType', params.entityType)
  if (params.action) query.set('action', params.action)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildAuditLogQueryString(params: AuditLogQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.userId) query.set('userId', params.userId)
  if (params.action) query.set('action', params.action)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useActivityLogs(params: ActivityLogQueryParams = {}) {
  return useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () =>
      apiGet<ActivityLogListResponse>(
        `/activity-logs${buildActivityLogQueryString(params)}`,
      ),
  })
}

export function useAuditLogs(params: AuditLogQueryParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () =>
      apiGet<UserAuditLogListResponse>(
        `/audit-logs${buildAuditLogQueryString(params)}`,
      ),
  })
}
