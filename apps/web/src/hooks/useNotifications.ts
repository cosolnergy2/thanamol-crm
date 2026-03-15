import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '@/lib/api-client'
import type {
  NotificationListResponse,
  Notification,
  NotificationQueryParams,
} from '@thanamol/shared'

function buildNotificationQueryString(params: NotificationQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.isRead !== undefined) query.set('isRead', String(params.isRead))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useNotifications(params: NotificationQueryParams = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () =>
      apiGet<NotificationListResponse>(
        `/notifications${buildNotificationQueryString(params)}`,
      ),
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPut<Notification>(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPut<{ message: string }>('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
