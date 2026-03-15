import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  ClientUserListResponse,
  ClientUser,
  CreateClientUserRequest,
  UpdateClientUserRequest,
  ClientUserQueryParams,
  ClientUpdateRequestListResponse,
  ClientUpdateRequest,
  CreateClientUpdateRequestRequest,
  UpdateClientUpdateRequestRequest,
  ClientUpdateRequestQueryParams,
} from '@thanamol/shared'

function buildClientQueryString(params: ClientUserQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.customerId) query.set('customerId', params.customerId)
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function buildUpdateRequestQueryString(params: ClientUpdateRequestQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.clientUserId) query.set('clientUserId', params.clientUserId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useClients(params: ClientUserQueryParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () =>
      apiGet<ClientUserListResponse>(`/clients${buildClientQueryString(params)}`),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => apiGet<{ client: ClientUser }>(`/clients/${id}`),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClientUserRequest) => apiPost<{ client: ClientUser }>('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientUserRequest }) =>
      apiPut<{ client: ClientUser }>(`/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useClientUpdateRequests(params: ClientUpdateRequestQueryParams = {}) {
  return useQuery({
    queryKey: ['client-update-requests', params],
    queryFn: () =>
      apiGet<ClientUpdateRequestListResponse>(
        `/client-update-requests${buildUpdateRequestQueryString(params)}`
      ),
  })
}

export function useCreateClientUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClientUpdateRequestRequest) =>
      apiPost<{ request: ClientUpdateRequest }>('/client-update-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-update-requests'] })
    },
  })
}

export function useUpdateClientRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientUpdateRequestRequest }) =>
      apiPut<{ request: ClientUpdateRequest }>(`/client-update-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-update-requests'] })
    },
  })
}

export function useDeleteClientUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/client-update-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-update-requests'] })
    },
  })
}
