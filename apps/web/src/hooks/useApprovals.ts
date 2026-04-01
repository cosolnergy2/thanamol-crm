import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ApprovalWorkflowListResponse,
  ApprovalRequestListResponse,
  CreateApprovalWorkflowRequest,
  UpdateApprovalWorkflowRequest,
  CreateApprovalRequestRequest,
  ApproveRequestBody,
  RejectRequestBody,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

export const APPROVAL_WORKFLOW_KEYS = {
  all: ['approval-workflows'] as const,
  list: (params?: Record<string, unknown>) =>
    ['approval-workflows', 'list', params] as const,
  detail: (id: string) => ['approval-workflows', id] as const,
}

export const APPROVAL_REQUEST_KEYS = {
  all: ['approval-requests'] as const,
  pending: (params?: Record<string, unknown>) =>
    ['approval-requests', 'pending', params] as const,
  detail: (id: string) => ['approval-requests', id] as const,
}

// ─── Workflow Hooks ───────────────────────────────────────────────────────────

export function useApprovalWorkflows(
  params: { entityType?: string; isActive?: string; page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: APPROVAL_WORKFLOW_KEYS.list(params as Record<string, unknown>),
    queryFn: () =>
      apiGet<ApprovalWorkflowListResponse>(
        `/fms/approval-workflows${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useApprovalWorkflow(id: string) {
  return useQuery({
    queryKey: APPROVAL_WORKFLOW_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ workflow: ApprovalWorkflowListResponse['data'][number] & { _count: { requests: number } } }>(
        `/fms/approval-workflows/${id}`
      ),
    enabled: Boolean(id),
  })
}

export function useCreateApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApprovalWorkflowRequest) =>
      apiPost<{ workflow: ApprovalWorkflowListResponse['data'][number] }>(
        '/fms/approval-workflows',
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_WORKFLOW_KEYS.all })
    },
  })
}

export function useUpdateApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateApprovalWorkflowRequest & { id: string }) =>
      apiPut<{ workflow: ApprovalWorkflowListResponse['data'][number] }>(
        `/fms/approval-workflows/${id}`,
        body
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_WORKFLOW_KEYS.all })
      queryClient.invalidateQueries({
        queryKey: APPROVAL_WORKFLOW_KEYS.detail(variables.id),
      })
    },
  })
}

export function useDeleteApprovalWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/fms/approval-workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_WORKFLOW_KEYS.all })
    },
  })
}

// ─── Request Hooks ────────────────────────────────────────────────────────────

export function usePendingApprovalRequests(
  params: { entityType?: string; page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: APPROVAL_REQUEST_KEYS.pending(params as Record<string, unknown>),
    queryFn: () =>
      apiGet<ApprovalRequestListResponse>(
        `/fms/approval-requests/pending${buildQueryString(params as Record<string, unknown>)}`
      ),
    staleTime: 30 * 1000,
  })
}

export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: APPROVAL_REQUEST_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ request: ApprovalRequestListResponse['data'][number] }>(
        `/fms/approval-requests/${id}`
      ),
    enabled: Boolean(id),
  })
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApprovalRequestRequest) =>
      apiPost<{ request: ApprovalRequestListResponse['data'][number] }>(
        '/fms/approval-requests',
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUEST_KEYS.all })
    },
  })
}

export function useApproveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: ApproveRequestBody & { id: string }) =>
      apiPost<{ request: ApprovalRequestListResponse['data'][number] }>(
        `/fms/approval-requests/${id}/approve`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUEST_KEYS.all })
    },
  })
}

export function useRejectRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: RejectRequestBody & { id: string }) =>
      apiPost<{ request: ApprovalRequestListResponse['data'][number] }>(
        `/fms/approval-requests/${id}/reject`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_REQUEST_KEYS.all })
    },
  })
}
