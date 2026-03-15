import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  CompanyListResponse,
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '@thanamol/shared'

type CompanyQueryParams = {
  page?: number
  limit?: number
  search?: string
  industry?: string
  status?: string
}

function buildCompanyQueryString(params: CompanyQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.industry && params.industry !== 'all') query.set('industry', params.industry)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useCompanies(params: CompanyQueryParams = {}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () =>
      apiGet<CompanyListResponse>(`/companies${buildCompanyQueryString(params)}`),
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCompanyRequest) => apiPost<Company>('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyRequest }) =>
      apiPut<Company>(`/companies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
