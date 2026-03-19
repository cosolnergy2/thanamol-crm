import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import type {
  MeetingMinuteListResponse,
  MeetingMinuteWithCreator,
  MeetingMinuteQueryParams,
  MeetingMinuteStatus,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  MeetingTemplate,
  CreateMeetingTemplateRequest,
  UpdateMeetingTemplateRequest,
} from '@thanamol/shared'

function buildMeetingQueryString(params: MeetingMinuteQueryParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const MEETING_QUERY_KEYS = {
  all: ['meetings'] as const,
  list: (params: MeetingMinuteQueryParams) => ['meetings', 'list', params] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
  templates: ['meeting-templates'] as const,
  templateDetail: (id: string) => ['meeting-templates', 'detail', id] as const,
}

export function useMeetings(params: MeetingMinuteQueryParams = {}) {
  return useQuery({
    queryKey: MEETING_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<MeetingMinuteListResponse>(`/meetings${buildMeetingQueryString(params)}`),
  })
}

export function useMeetingById(id: string) {
  return useQuery({
    queryKey: MEETING_QUERY_KEYS.detail(id),
    queryFn: () => apiGet<{ meeting: MeetingMinuteWithCreator }>(`/meetings/${id}`),
    enabled: !!id,
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetingRequest) =>
      apiPost<{ meeting: MeetingMinuteWithCreator }>('/meetings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.all })
    },
  })
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMeetingRequest }) =>
      apiPut<{ meeting: MeetingMinuteWithCreator }>(`/meetings/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.all })
    },
  })
}

export function useMeetingTemplates() {
  return useQuery({
    queryKey: MEETING_QUERY_KEYS.templates,
    queryFn: () => apiGet<{ data: MeetingTemplate[] }>('/meeting-templates'),
  })
}

export function useMeetingTemplateById(id: string) {
  return useQuery({
    queryKey: MEETING_QUERY_KEYS.templateDetail(id),
    queryFn: () => apiGet<{ template: MeetingTemplate }>(`/meeting-templates/${id}`),
    enabled: !!id,
  })
}

export function useCreateMeetingTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetingTemplateRequest) =>
      apiPost<{ template: MeetingTemplate }>('/meeting-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.templates })
    },
  })
}

export function useUpdateMeetingTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMeetingTemplateRequest }) =>
      apiPut<{ template: MeetingTemplate }>(`/meeting-templates/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.templates })
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.templateDetail(id) })
    },
  })
}

export function useDeleteMeetingTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/meeting-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEETING_QUERY_KEYS.templates })
    },
  })
}
