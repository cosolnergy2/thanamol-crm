import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PDFTemplateListResponse,
  PDFTemplateRecord,
  CreatePDFTemplateRequest,
  UpdatePDFTemplateRequest,
  PDFTemplateQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const PDF_TEMPLATE_QUERY_KEYS = {
  all: ['pdf-templates'] as const,
  list: (params: PDFTemplateQueryParams) => ['pdf-templates', 'list', params] as const,
  detail: (id: string) => ['pdf-templates', id] as const,
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null && value !== 'all') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export function usePDFTemplates(params: PDFTemplateQueryParams = {}) {
  return useQuery({
    queryKey: PDF_TEMPLATE_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<PDFTemplateListResponse>(`/pdf-templates${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function usePDFTemplateById(id: string) {
  return useQuery({
    queryKey: PDF_TEMPLATE_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ template: PDFTemplateRecord }>(`/pdf-templates/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreatePDFTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePDFTemplateRequest) =>
      apiPost<{ template: PDFTemplateRecord }>('/pdf-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PDF_TEMPLATE_QUERY_KEYS.all })
    },
  })
}

export function useUpdatePDFTemplate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePDFTemplateRequest) =>
      apiPut<{ template: PDFTemplateRecord }>(`/pdf-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PDF_TEMPLATE_QUERY_KEYS.all })
    },
  })
}

export function useDeletePDFTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/pdf-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PDF_TEMPLATE_QUERY_KEYS.all })
    },
  })
}
