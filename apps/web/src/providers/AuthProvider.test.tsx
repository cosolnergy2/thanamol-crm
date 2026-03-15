import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { AuthProvider, useAuth } from './AuthProvider'

// ---- localStorage mock ----
const storage: Record<string, string> = {}
const localStorageMock: Storage = {
  length: 0,
  key: () => null,
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
}

// Stub window.location.href without replacing the whole window
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

// ---- api-client mock ----
const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockStoreTokens = vi.fn((a: string, b: string) => {
  storage['accessToken'] = a
  storage['refreshToken'] = b
})
const mockClearTokens = vi.fn(() => {
  delete storage['accessToken']
  delete storage['refreshToken']
})

vi.mock('@/lib/api-client', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  storeTokens: (...args: unknown[]) => mockStoreTokens(...(args as [string, string])),
  clearTokens: () => mockClearTokens(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  localStorageMock.clear()
  vi.stubGlobal('localStorage', localStorageMock)
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AuthProvider – initial state without token', () => {
  it('is not authenticated and not loading after mount', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentUser).toBeNull()
  })
})

describe('AuthProvider – initial state with valid token', () => {
  it('validates stored token and sets user', async () => {
    storage['accessToken'] = 'stored-token'
    const user = { id: '1', email: 'a@b.com', firstName: 'Alice', lastName: 'Smith', avatarUrl: null, isActive: true, roles: [] }
    mockApiGet.mockResolvedValueOnce({ user })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentUser?.email).toBe('a@b.com')
  })
})

describe('login()', () => {
  it('stores tokens and sets user on success', async () => {
    const user = { id: '2', email: 'b@c.com', firstName: 'Bob', lastName: 'Jones', avatarUrl: null, isActive: true, roles: [] }
    mockApiGet.mockRejectedValueOnce(new Error('no token'))
    mockApiPost.mockResolvedValueOnce({ user, accessToken: 'new-at', refreshToken: 'new-rt' })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.login('b@c.com', 'pass')
    })

    expect(mockStoreTokens).toHaveBeenCalledWith('new-at', 'new-rt')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentUser?.email).toBe('b@c.com')
  })

  it('throws and stays unauthenticated on login failure', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('no token'))
    mockApiPost.mockRejectedValueOnce(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.login('x@y.com', 'wrong')
      }),
    ).rejects.toThrow('Invalid credentials')

    expect(result.current.isAuthenticated).toBe(false)
  })
})

describe('logout()', () => {
  it('clears tokens and sets user to null', async () => {
    storage['accessToken'] = 'at'
    const user = { id: '3', email: 'c@d.com', firstName: 'Carol', lastName: 'White', avatarUrl: null, isActive: true, roles: [] }
    mockApiGet.mockResolvedValueOnce({ user })
    mockApiPost.mockResolvedValueOnce({})

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await result.current.logout()
    })

    expect(mockClearTokens).toHaveBeenCalled()
    expect(result.current.currentUser).toBeNull()
  })
})
