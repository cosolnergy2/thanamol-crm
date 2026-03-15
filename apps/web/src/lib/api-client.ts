import type { RefreshResponse } from '@thanamol/shared'

const BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '/api'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const

function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  isRefreshing = true
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      const data: RefreshResponse = await res.json()
      const existing = getRefreshToken()
      if (existing) {
        storeTokens(data.accessToken, existing)
      }
      return true
    })
    .catch(() => false)
    .finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

  return refreshPromise
}

function redirectToLogin(): void {
  clearTokens()
  window.location.href = '/login'
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`

  const response = await fetch(url, {
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    const refreshed = await attemptTokenRefresh()
    if (!refreshed) {
      redirectToLogin()
      throw new Error('Session expired')
    }

    const retryResponse = await fetch(url, {
      method,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!retryResponse.ok) {
      if (retryResponse.status === 401) {
        redirectToLogin()
        throw new Error('Session expired')
      }
      const errorData = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }))
      throw new Error(errorData.message ?? retryResponse.statusText)
    }

    return retryResponse.json() as Promise<T>
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(errorData.message ?? response.statusText)
  }

  return response.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}
