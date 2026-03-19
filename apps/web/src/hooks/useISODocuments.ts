import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ISODocumentListResponse,
  ISODocumentRecord,
  CreateISODocumentRequest,
  UpdateISODocumentRequest,
  ISODocumentQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const ISO_DOCUMENT_QUERY_KEYS = {
  all: ['iso-documents'] as const,
  list: (params: ISODocumentQueryParams) => ['iso-documents', 'list', params] as const,
  detail: (id: string) => ['iso-documents', id] as const,
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

export function useISODocuments(params: ISODocumentQueryParams = {}) {
  return useQuery({
    queryKey: ISO_DOCUMENT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ISODocumentListResponse>(`/iso-documents${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useISODocumentById(id: string) {
  return useQuery({
    queryKey: ISO_DOCUMENT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ isoDocument: ISODocumentRecord }>(`/iso-documents/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateISODocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateISODocumentRequest) =>
      apiPost<{ isoDocument: ISODocumentRecord }>('/iso-documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISO_DOCUMENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateISODocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateISODocumentRequest) =>
      apiPut<{ isoDocument: ISODocumentRecord }>(`/iso-documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISO_DOCUMENT_QUERY_KEYS.all })
    },
  })
}

export function useDeleteISODocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/iso-documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ISO_DOCUMENT_QUERY_KEYS.all })
    },
  })
}
