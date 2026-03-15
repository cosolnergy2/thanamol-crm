import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { AuthUser, LoginRequest, RegisterRequest, AuthResponse, MeResponse } from '@thanamol/shared'
import { apiGet, apiPost, clearTokens, storeTokens } from '@/lib/api-client'

const REFRESH_LEAD_MS = 30_000

function parseTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000
    }
    return null
  } catch {
    return null
  }
}

type AuthContextValue = {
  currentUser: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    const expiry = parseTokenExpiry(accessToken)
    if (!expiry) return
    const delay = expiry - Date.now() - REFRESH_LEAD_MS
    if (delay <= 0) return

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) return
        const data = await apiPost<AuthResponse>('/auth/refresh', { refreshToken })
        const existingRefresh = localStorage.getItem('refreshToken')
        storeTokens(data.accessToken, data.refreshToken ?? existingRefresh ?? refreshToken)
        scheduleRefresh(data.accessToken)
      } catch {
        setCurrentUser(null)
        clearTokens()
      }
    }, delay)
  }, [])

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const { user } = await apiGet<MeResponse>('/auth/me')
        setCurrentUser(user)
        scheduleRefresh(token)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }
    init()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [scheduleRefresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiPost<AuthResponse>('/auth/login', {
        email,
        password,
      } satisfies LoginRequest)
      storeTokens(data.accessToken, data.refreshToken)
      setCurrentUser(data.user)
      scheduleRefresh(data.accessToken)
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout')
    } catch {
      // best-effort logout
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    clearTokens()
    setCurrentUser(null)
    window.location.href = '/login'
  }, [])

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await apiPost<AuthResponse>('/auth/register', data)
      storeTokens(res.accessToken, res.refreshToken)
      setCurrentUser(res.user)
      scheduleRefresh(res.accessToken)
    },
    [scheduleRefresh],
  )

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isAuthenticated: currentUser !== null,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
