import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DocumentListResponse,
  DocumentRecord,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentQueryParams,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const DOCUMENT_QUERY_KEYS = {
  all: ['documents'] as const,
  list: (params: DocumentQueryParams) => ['documents', 'list', params] as const,
  detail: (id: string) => ['documents', id] as const,
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export function useDocuments(params: DocumentQueryParams = {}) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<DocumentListResponse>(`/documents${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useDocumentById(id: string) {
  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ document: DocumentRecord }>(`/documents/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDocumentRequest) =>
      apiPost<{ document: DocumentRecord }>('/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateDocumentRequest) =>
      apiPut<{ document: DocumentRecord }>(`/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.all })
    },
  })
}
