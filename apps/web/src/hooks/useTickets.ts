import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  TicketListResponse,
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketQueryParams,
} from '@thanamol/shared'

function buildTicketQueryString(params: TicketQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.priority && params.priority !== 'all') query.set('priority', params.priority)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.assignedTo) query.set('assignedTo', params.assignedTo)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useTickets(params: TicketQueryParams = {}) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => apiGet<TicketListResponse>(`/tickets${buildTicketQueryString(params)}`),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTicketRequest) => apiPost<Ticket>('/tickets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketRequest }) =>
      apiPut<Ticket>(`/tickets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
