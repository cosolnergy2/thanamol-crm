import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  JournalEntry,
  JournalEntryWithLines,
  JournalEntryListResponse,
  JournalEntryQueryParams,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'

export const JOURNAL_QUERY_KEYS = {
  all: ['journal-entries'] as const,
  list: (params: JournalEntryQueryParams) => ['journal-entries', 'list', params] as const,
  detail: (id: string) => ['journal-entries', id] as const,
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

export function useJournalEntries(params: JournalEntryQueryParams = {}) {
  return useQuery({
    queryKey: JOURNAL_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<JournalEntryListResponse>(
        `/finance/journal-entries${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: JOURNAL_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateJournalEntryRequest) =>
      apiPost<{ journal: JournalEntryWithLines }>('/finance/journal-entries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
    },
  })
}

export function useUpdateJournalEntry(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateJournalEntryRequest) =>
      apiPut<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useSubmitJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}/submit`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useApproveJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}/approve`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}/post`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useCancelJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}/cancel`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.detail(id) })
    },
  })
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ journal: JournalEntryWithLines }>(`/finance/journal-entries/${id}/reverse`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_QUERY_KEYS.all })
    },
  })
}
