import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiPatch } from '@/lib/api-client'
import type {
  HelpdeskListResponse,
  HelpdeskTicket,
  CreateHelpdeskTicketRequest,
  UpdateHelpdeskTicketRequest,
  HelpdeskQueryParams,
  TicketStatus,
  CreateWorkOrderFromTicketRequest,
} from '@thanamol/shared'

function buildHelpdeskQueryString(params: HelpdeskQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.projectId) query.set('projectId', params.projectId)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.priority && params.priority !== 'all') query.set('priority', params.priority)
  if (params.site) query.set('site', params.site)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useHelpdeskTickets(params: HelpdeskQueryParams = {}) {
  return useQuery({
    queryKey: ['helpdesk', params],
    queryFn: () =>
      apiGet<HelpdeskListResponse>(`/fms/helpdesk${buildHelpdeskQueryString(params)}`),
  })
}

export function useHelpdeskTicket(id: string) {
  return useQuery({
    queryKey: ['helpdesk', id],
    queryFn: () => apiGet<{ ticket: HelpdeskTicket }>(`/fms/helpdesk/${id}`),
    enabled: !!id,
  })
}

export function useCreateHelpdeskTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHelpdeskTicketRequest) =>
      apiPost<{ ticket: HelpdeskTicket }>('/fms/helpdesk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] })
    },
  })
}

export function useUpdateHelpdeskTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHelpdeskTicketRequest }) =>
      apiPut<{ ticket: HelpdeskTicket }>(`/fms/helpdesk/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] })
    },
  })
}

export function useUpdateHelpdeskTicketStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      apiPatch<{ ticket: HelpdeskTicket }>(`/fms/helpdesk/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] })
    },
  })
}

export function useCreateWorkOrderFromTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ticketId,
      data,
    }: {
      ticketId: string
      data: CreateWorkOrderFromTicketRequest
    }) =>
      apiPost<{ workOrder: unknown; ticket: HelpdeskTicket }>(
        `/fms/helpdesk/${ticketId}/create-work-order`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] })
    },
  })
}
