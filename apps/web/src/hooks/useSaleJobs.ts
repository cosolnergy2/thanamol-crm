import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  SaleJob04F01ListResponse,
  SaleJob04F01,
  CreateSaleJob04F01Request,
  UpdateSaleJob04F01Request,
  SaleJobQueryParams,
} from '@thanamol/shared'

function buildQueryString(params: SaleJobQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.projectId) query.set('projectId', params.projectId)
  if (params.customerId) query.set('customerId', params.customerId)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useSaleJobs(params: SaleJobQueryParams = {}) {
  return useQuery({
    queryKey: ['sale-jobs', params],
    queryFn: () =>
      apiGet<SaleJob04F01ListResponse>(`/sale-jobs${buildQueryString(params)}`),
  })
}

export function useSaleJob(id: string) {
  return useQuery({
    queryKey: ['sale-jobs', id],
    queryFn: () => apiGet<SaleJob04F01>(`/sale-jobs/${id}`),
    enabled: !!id,
  })
}

export function useCreateSaleJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSaleJob04F01Request) =>
      apiPost<SaleJob04F01>('/sale-jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-jobs'] })
    },
  })
}

export function useUpdateSaleJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSaleJob04F01Request }) =>
      apiPut<SaleJob04F01>(`/sale-jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-jobs'] })
    },
  })
}

export function useDeleteSaleJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/sale-jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-jobs'] })
    },
  })
}

export function useApproveSaleJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost<SaleJob04F01>(`/sale-jobs/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-jobs'] })
    },
  })
}

export function useRejectSaleJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPost<SaleJob04F01>(`/sale-jobs/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-jobs'] })
    },
  })
}
