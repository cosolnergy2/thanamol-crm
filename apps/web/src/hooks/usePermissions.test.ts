import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockApiGet = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: vi.fn(),
  storeTokens: vi.fn(),
  clearTokens: vi.fn(),
}))

const mockUseAuth = vi.fn()
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

import { usePermissions } from './usePermissions'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const baseUser = {
  id: 'user-1',
  email: 'a@b.com',
  firstName: 'Alice',
  lastName: 'Smith',
  avatarUrl: null,
  isActive: true,
  roles: [{ id: 'r1', name: 'editor' }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePermissions', () => {
  it('returns isLoading true while fetching', () => {
    mockUseAuth.mockReturnValue({ currentUser: baseUser })
    mockApiGet.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() })
    expect(result.current.isLoading).toBe(true)
  })

  it('returns permissions and hasPermission after successful fetch', async () => {
    mockUseAuth.mockReturnValue({ currentUser: baseUser })
    mockApiGet.mockResolvedValue({ permissions: { dashboard: true, reports: false } })

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.permissions).toEqual({ dashboard: true, reports: false })
    expect(result.current.hasPermission('dashboard')).toBe(true)
    expect(result.current.hasPermission('reports')).toBe(false)
    expect(result.current.hasPermission('settings')).toBe(false)
  })

  it('returns empty permissions on fetch error', async () => {
    mockUseAuth.mockReturnValue({ currentUser: baseUser })
    mockApiGet.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.permissions).toEqual({})
    expect(result.current.hasPermission('dashboard')).toBe(false)
  })

  it('returns roles from currentUser.roles', async () => {
    mockUseAuth.mockReturnValue({ currentUser: baseUser })
    mockApiGet.mockResolvedValue({ permissions: {} })

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.roles).toEqual(['editor'])
    expect(result.current.hasRole('editor')).toBe(true)
    expect(result.current.hasRole('admin')).toBe(false)
  })

  it('does not fetch when currentUser is null', () => {
    mockUseAuth.mockReturnValue({ currentUser: null })

    const { result } = renderHook(() => usePermissions(), { wrapper: makeWrapper() })
    expect(mockApiGet).not.toHaveBeenCalled()
    expect(result.current.permissions).toEqual({})
    expect(result.current.roles).toEqual([])
  })
})
