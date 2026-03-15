import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  ContactListResponse,
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
} from '@thanamol/shared'

type ContactQueryParams = {
  page?: number
  limit?: number
  customerId?: string
}

function buildContactQueryString(params: ContactQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.customerId && params.customerId !== 'all')
    query.set('customerId', params.customerId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useContacts(params: ContactQueryParams = {}) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () =>
      apiGet<ContactListResponse>(`/contacts${buildContactQueryString(params)}`),
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContactRequest) => apiPost<Contact>('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactRequest }) =>
      apiPut<Contact>(`/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
