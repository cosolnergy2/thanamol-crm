import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ProjectListResponse,
  ProjectWithUnitCounts,
  ProjectDashboard,
  UnitListResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '@thanamol/shared'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

export const PROJECT_QUERY_KEYS = {
  all: ['projects'] as const,
  list: (params: ProjectListParams) => ['projects', 'list', params] as const,
  detail: (id: string) => ['projects', id] as const,
  dashboard: (id: string) => ['projects', id, 'dashboard'] as const,
  units: (id: string, params?: Record<string, unknown>) =>
    ['projects', id, 'units', params] as const,
}

export type ProjectListParams = {
  page?: number
  limit?: number
  search?: string
  status?: string
  type?: string
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

export function useProjects(params: ProjectListParams = {}) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.list(params),
    queryFn: () =>
      apiGet<ProjectListResponse>(`/projects${buildQueryString(params as Record<string, unknown>)}`),
    staleTime: 30 * 1000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.detail(id),
    queryFn: () =>
      apiGet<{ project: ProjectWithUnitCounts }>(`/projects/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useProjectDashboard(id: string) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.dashboard(id),
    queryFn: () =>
      apiGet<{ dashboard: ProjectDashboard }>(`/projects/${id}/dashboard`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  })
}

export type ProjectUnitsParams = {
  page?: number
  limit?: number
  status?: string
  type?: string
}

export function useProjectUnits(projectId: string, params: ProjectUnitsParams = {}) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEYS.units(projectId, params as Record<string, unknown>),
    queryFn: () =>
      apiGet<UnitListResponse>(
        `/projects/${projectId}/units${buildQueryString(params as Record<string, unknown>)}`
      ),
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      apiPost<{ project: ProjectWithUnitCounts }>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateProjectRequest) =>
      apiPut<{ project: ProjectWithUnitCounts }>(`/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.detail(id) })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ project: ProjectWithUnitCounts }>(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all })
    },
  })
}
