import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearTokens, storeTokens } from './api-client'

// ---- localStorage mock ----
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)

// ---- fetch mock helpers ----
function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  localStorageMock.clear()
  vi.unstubAllGlobals()
  vi.stubGlobal('localStorage', localStorageMock)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storeTokens / clearTokens', () => {
  it('stores access and refresh tokens', () => {
    storeTokens('access123', 'refresh456')
    expect(localStorage.getItem('accessToken')).toBe('access123')
    expect(localStorage.getItem('refreshToken')).toBe('refresh456')
  })

  it('clears both tokens', () => {
    storeTokens('a', 'b')
    clearTokens()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})

describe('apiPost – happy path', () => {
  it('sends POST with JSON body and returns parsed response', async () => {
    const fetchMock = mockFetchOnce(200, { user: { id: '1', email: 'test@test.com' }, accessToken: 'at', refreshToken: 'rt' })
    vi.stubGlobal('fetch', fetchMock)

    const { apiPost } = await import('./api-client')
    const result = await apiPost<{ user: { id: string } }>('/auth/login', { email: 'test@test.com', password: 'pw' })
    expect(result.user.id).toBe('1')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/auth/login')
    expect(JSON.parse(opts.body as string)).toEqual({ email: 'test@test.com', password: 'pw' })
  })
})

describe('apiGet – attaches Authorization header when token present', () => {
  it('includes Bearer token in header', async () => {
    storeTokens('mytoken', 'ref')
    const fetchMock = mockFetchOnce(200, { user: { id: '1' } })
    vi.stubGlobal('fetch', fetchMock)

    const { apiGet } = await import('./api-client')
    await apiGet('/auth/me')
    const [, opts] = fetchMock.mock.calls[0]
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer mytoken')
  })
})

describe('apiGet – error path', () => {
  it('throws with server error message on non-401 failure', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: () => Promise.resolve({ message: 'Validation error' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { apiGet } = await import('./api-client')
    await expect(apiGet('/some/path')).rejects.toThrow('Validation error')
  })
})
