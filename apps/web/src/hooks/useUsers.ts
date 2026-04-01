import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'

export type UserSummary = {
  id: string
  email: string
  first_name: string
  last_name: string
  department: string | null
  position: string | null
  is_active: boolean
}

type UsersResponse = {
  users: UserSummary[]
}

export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  list: () => ['users', 'list'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.list(),
    queryFn: () => apiGet<UsersResponse>('/auth/users'),
    staleTime: 60 * 1000,
  })
}
